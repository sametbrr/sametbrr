import {
  AdditiveBlending,
  NormalBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";
import {
  CAMERA_Z,
  CORE_RADIUS,
  ORBITS,
  TILT_X,
  fibonacciSphere,
  orbitPoint,
  satelliteAngle,
  type Vec3,
} from "./core-layout";
import { SOFT_POINT_FRAGMENT, createFrameProbe, type SceneTheme } from "./shared";

const CORE_POINTS = 2200;
const TOKENS = 260;
const MAX_CALLS = 6;
const TRAIL = 10;

// Ashima Arts 3D simplex noise (MIT).
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;



/** The model: a breathing particle sphere with neurons that fire at random. */
const CORE_VERTEX = /* glsl */ `
  ${NOISE}
  attribute float aSeed;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uFire;
  uniform float uPixelRatio;
  uniform vec3 uIce;
  uniform vec3 uGhost;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 n = normalize(position);
    float d = snoise(n * 1.7 + vec3(uTime * (0.16 + uEnergy * 0.25)));
    vec3 p = n * length(position) * (1.0 + d * (0.11 + uEnergy * 0.12));
    float fire = pow(max(0.0, sin(uTime * (0.5 + aSeed * 1.3) + aSeed * 62.83)), 48.0);
    vec3 facingN = normalize(normalMatrix * n);
    float front = smoothstep(-0.7, 0.9, facingN.z);
    vColor = mix(uIce, uGhost, smoothstep(-0.3, 0.5, d)) + fire * uFire;
    vAlpha = (0.28 + 0.72 * front) * (0.85 + fire * 1.4);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (4.6 + fire * 7.0) * uPixelRatio * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

/** Generated tokens: particles spiralling out of the core and fading, computed fully on the GPU. */
const TOKEN_VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3 uIce;
  uniform vec3 uGhost;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float life = fract(uTime * aSpeed + aSeed);
    float ang = aSeed * 43.98 + life * 2.6;
    float rad = ${(CORE_RADIUS * 1.08).toFixed(3)} + life * 2.3;
    vec3 p = vec3(cos(ang) * rad, (aSeed - 0.5) * 0.5 * life, sin(ang) * rad);
    vColor = mix(uGhost, uIce, life);
    vAlpha = smoothstep(0.0, 0.1, life) * (1.0 - life) * 0.85;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (3.0 + (1.0 - life) * 2.6) * uPixelRatio * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

/** Satellites and tool-call trails: CPU-positioned, per-point size/colour/alpha. */
const DYNAMIC_VERTEX = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  attribute float alpha;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uPixelRatio * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

function material(vertexShader: string, uniforms: Record<string, { value: unknown }>, light: boolean) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader: SOFT_POINT_FRAGMENT,
    uniforms,
    defines: light ? { LIGHT: 1 } : {},
    transparent: true,
    depthWrite: false,
    blending: light ? NormalBlending : AdditiveBlending,
  });
}

type Call = { orbit: number; sat: number; t: number; phase: "out" | "back" };

/**
 * Mounts the hero "Model Core + Tool Orbit" scene (DESIGN.md §7): an AI model at the centre
 * calling tools on orbiting layers — request out in blue, response back in green.
 * Returns a cleanup function. Rendering pauses when off-screen or the tab is hidden.
 */
export function mountCoreScene(
  canvas: HTMLCanvasElement,
  theme: SceneTheme,
  { scrollPull }: { scrollPull: boolean },
  onReady: () => void,
  onFail: () => void,
) {
  const light = theme.mode === "light";
  const ICE = new Color(theme.ice);
  const GHOST = new Color(theme.ghost);
  // Quantum Blue; lifted in dark mode so it reads as glow under additive blending.
  const REQUEST = new Color(light ? "#2457FF" : "#5B82FF");
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });

  // Software rasterizers (no GPU) would starve the main thread: keep the poster.
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) {
    renderer.dispose();
    throw new Error(`software renderer: ${gpu}`);
  }
  renderer.setPixelRatio(pixelRatio);

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.set(0, 0, CAMERA_Z);

  const world = new Group();
  world.rotation.x = TILT_X;
  scene.add(world);

  const shared = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uIce: { value: ICE },
    uGhost: { value: GHOST },
  };
  const geometries: BufferGeometry[] = [];
  const materials: (ShaderMaterial | LineBasicMaterial)[] = [];

  // Core
  const corePos = new Float32Array(CORE_POINTS * 3);
  const coreSeed = new Float32Array(CORE_POINTS);
  fibonacciSphere(CORE_POINTS, CORE_RADIUS).forEach((p, i) => {
    corePos.set([p.x, p.y, p.z], i * 3);
    coreSeed[i] = Math.random();
  });
  const coreGeo = new BufferGeometry();
  coreGeo.setAttribute("position", new BufferAttribute(corePos, 3));
  coreGeo.setAttribute("aSeed", new BufferAttribute(coreSeed, 1));
  const coreMat = material(CORE_VERTEX, { ...shared, uEnergy: { value: 0 }, uFire: { value: light ? 0 : 0.8 } }, light);
  const core = new Points(coreGeo, coreMat);
  world.add(core);
  geometries.push(coreGeo);
  materials.push(coreMat);

  // Token stream, on a slightly tilted disc
  const tokenGroup = new Group();
  tokenGroup.rotation.set(0.35, 0, 0.12);
  const tokenSeed = new Float32Array(TOKENS);
  const tokenSpeed = new Float32Array(TOKENS);
  for (let i = 0; i < TOKENS; i++) {
    tokenSeed[i] = Math.random();
    tokenSpeed[i] = 0.05 + Math.random() * 0.07;
  }
  const tokenGeo = new BufferGeometry();
  tokenGeo.setAttribute("position", new BufferAttribute(new Float32Array(TOKENS * 3), 3));
  tokenGeo.setAttribute("aSeed", new BufferAttribute(tokenSeed, 1));
  tokenGeo.setAttribute("aSpeed", new BufferAttribute(tokenSpeed, 1));
  const tokenMat = material(TOKEN_VERTEX, shared, light);
  const tokens = new Points(tokenGeo, tokenMat);
  tokens.frustumCulled = false;
  tokenGroup.add(tokens);
  world.add(tokenGroup);
  geometries.push(tokenGeo);
  materials.push(tokenMat);

  // Orbit rings
  const ringMat = new LineBasicMaterial({
    color: new Color(theme.fg),
    transparent: true,
    opacity: light ? 0.14 : 0.09,
    blending: light ? NormalBlending : AdditiveBlending,
    depthWrite: false,
  });
  materials.push(ringMat);
  ORBITS.forEach((orbit) => {
    const pts = new Float32Array(128 * 3);
    for (let i = 0; i < 128; i++) {
      const p = orbitPoint(orbit, (i / 128) * Math.PI * 2);
      pts.set([p.x, p.y, p.z], i * 3);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pts, 3));
    geometries.push(geo);
    world.add(new LineLoop(geo, ringMat));
  });

  // Satellites + call trails share one dynamic point cloud
  const satList = ORBITS.flatMap((o, oi) => Array.from({ length: o.satellites }, (_, si) => ({ orbit: oi, sat: si, flash: 0 })));
  const dynCount = satList.length + MAX_CALLS * TRAIL;
  const dynPos = new Float32Array(dynCount * 3);
  const dynCol = new Float32Array(dynCount * 3);
  const dynSize = new Float32Array(dynCount);
  const dynAlpha = new Float32Array(dynCount);
  const dynGeo = new BufferGeometry();
  dynGeo.setAttribute("position", new BufferAttribute(dynPos, 3));
  dynGeo.setAttribute("color", new BufferAttribute(dynCol, 3));
  dynGeo.setAttribute("size", new BufferAttribute(dynSize, 1));
  dynGeo.setAttribute("alpha", new BufferAttribute(dynAlpha, 1));
  const dynMat = material(DYNAMIC_VERTEX, { uPixelRatio: shared.uPixelRatio }, light);
  const dyn = new Points(dynGeo, dynMat);
  dyn.frustumCulled = false;
  world.add(dyn);
  geometries.push(dynGeo);
  materials.push(dynMat);

  const calls: Call[] = [];
  let spawnIn = 0.4;
  const satPos = (s: (typeof satList)[number], time: number) =>
    orbitPoint(ORBITS[s.orbit], satelliteAngle(s.orbit, s.sat, time));

  /** Quadratic bezier from the core surface to a satellite, bowed outward. */
  function curve(to: Vec3, t: number): Vec3 {
    const len = Math.hypot(to.x, to.y, to.z) || 1;
    const from = { x: (to.x / len) * CORE_RADIUS, y: (to.y / len) * CORE_RADIUS, z: (to.z / len) * CORE_RADIUS };
    const ctrl = { x: (from.x + to.x) * 0.5 * 1.25, y: (from.y + to.y) * 0.5 * 1.25 + 0.35, z: (from.z + to.z) * 0.5 * 1.25 };
    const u = 1 - t;
    return {
      x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y,
      z: u * u * from.z + 2 * u * t * ctrl.z + t * t * to.z,
    };
  }

  function stepDynamic(time: number, dt: number) {
    // Spawn tool calls at a calm, irregular cadence.
    spawnIn -= dt;
    if (spawnIn <= 0 && calls.length < MAX_CALLS) {
      const s = satList[Math.floor(Math.random() * satList.length)];
      calls.push({ orbit: s.orbit, sat: s.sat, t: 0, phase: "out" });
      spawnIn = 0.35 + Math.random() * 0.6;
    }

    satList.forEach((s, i) => {
      const p = satPos(s, time);
      s.flash = Math.max(0, s.flash - dt * 2.2);
      dynPos.set([p.x, p.y, p.z], i * 3);
      const c = ICE.clone().lerp(GHOST, s.flash);
      dynCol.set([c.r, c.g, c.b], i * 3);
      dynSize[i] = 11 + s.flash * 14;
      dynAlpha[i] = 0.75 + s.flash * 0.5;
    });

    for (let c = calls.length - 1; c >= 0; c--) {
      const call = calls[c];
      call.t += dt / 0.85;
      if (call.t >= 1) {
        if (call.phase === "out") {
          satList.find((s) => s.orbit === call.orbit && s.sat === call.sat)!.flash = 1;
          call.phase = "back";
          call.t = 0;
        } else {
          calls.splice(c, 1);
        }
      }
    }

    const base = satList.length;
    for (let c = 0; c < MAX_CALLS; c++) {
      const call = calls[c];
      for (let k = 0; k < TRAIL; k++) {
        const idx = base + c * TRAIL + k;
        if (!call) {
          dynAlpha[idx] = 0;
          dynSize[idx] = 0;
          continue;
        }
        const head = Math.min(1, call.t) - k * 0.028;
        if (head < 0) {
          dynAlpha[idx] = 0;
          continue;
        }
        const to = satPos(satList.find((s) => s.orbit === call.orbit && s.sat === call.sat)!, time);
        const along = call.phase === "out" ? head : 1 - head;
        const p = curve(to, along);
        dynPos.set([p.x, p.y, p.z], idx * 3);
        const col = call.phase === "out" ? REQUEST : GHOST;
        dynCol.set([col.r, col.g, col.b], idx * 3);
        dynSize[idx] = (k === 0 ? 9 : 6.5) * (1 - k / TRAIL);
        dynAlpha[idx] = (1 - k / TRAIL) * 0.95;
      }
    }

    dynGeo.attributes.position.needsUpdate = true;
    dynGeo.attributes.color.needsUpdate = true;
    dynGeo.attributes.size.needsUpdate = true;
    dynGeo.attributes.alpha.needsUpdate = true;
  }

  // Interaction: ±8° pointer parallax; pointer movement raises the core's "thinking" energy.
  const target = { x: 0, y: 0 };
  let energy = 0;
  let lastPointer: { x: number; y: number } | null = null;
  const onPointer = (e: PointerEvent) => {
    target.x = (e.clientY / window.innerHeight - 0.5) * 0.28;
    target.y = (e.clientX / window.innerWidth - 0.5) * 0.28;
    if (lastPointer) {
      const moved = Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y);
      energy = Math.min(1, energy + moved / 900);
    }
    lastPointer = { x: e.clientX, y: e.clientY };
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = CAMERA_Z * Math.max(1, 1.2 / camera.aspect);
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  let visible = true;
  let frame = 0;
  let last = performance.now();
  let time = 0;
  let spin = 0.35;
  let first = true;
  const probe = createFrameProbe();
  let failed = false;

  function loop(now: number) {
    if (failed) return;
    frame = requestAnimationFrame(loop);
    const raw = now - last;
    last = now;
    if (!first && probe(raw) === "fail") {
      failed = true;
      cancelAnimationFrame(frame);
      onFail();
      return;
    }
    const dt = Math.min(0.05, raw / 1000);
    time += dt;
    spin += dt * 0.05;
    energy = Math.max(0, energy - dt * 0.6);

    shared.uTime.value = time;
    coreMat.uniforms.uEnergy.value += (energy - coreMat.uniforms.uEnergy.value) * 0.08;
    core.rotation.y += dt * 0.08;
    world.rotation.y += (spin + target.y - world.rotation.y) * 0.05;
    world.rotation.x += (TILT_X + target.x - world.rotation.x) * 0.05;
    if (scrollPull) {
      const scroll = Math.min(1, window.scrollY / window.innerHeight);
      world.position.z = -scroll * 2.2;
      camera.position.y = -scroll * 0.6;
    }

    stepDynamic(time, dt);
    renderer.render(scene, camera);
    if (first) {
      first = false;
      onReady();
    }
  }

  function setRunning(run: boolean) {
    cancelAnimationFrame(frame);
    if (run && !failed) {
      last = performance.now();
      frame = requestAnimationFrame(loop);
    }
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    setRunning(visible && !document.hidden);
  });
  io.observe(canvas);
  const onVisibility = () => setRunning(visible && !document.hidden);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    cancelAnimationFrame(frame);
    io.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onPointer);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    renderer.dispose();
  };
}
