import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LinearFilter,
  Mesh,
  NoColorSpace,
  NormalBlending,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
} from "three";
import { SOFT_POINT_FRAGMENT, createFrameProbe, type SceneTheme } from "./shared";

/** Sampling grid across the (square) cutout: ~45% coverage → ~16k particles. */
const GRID = 190;
/** The square photo is 1 unit; the 4:5 frustum crops it to a portrait framing (shoulders cut at the sides). */
const VIEW_W = 0.8;
const VIEW_H = 1;
const IMAGE_TOP = 0.5;
const IMAGE_BOTTOM = -0.5;
/** Lens radius (world units) of the post-reveal "digitize" effect around the pointer. */
const LENS = 0.15;

/** Intro timeline in seconds (DESIGN.md §7): core → portrait, then the scan line reveals the photo. */
const ASSEMBLE_START = 0.2;
const ASSEMBLE_DURATION = 2.0;
const REVEAL_START = 2.6;
const REVEAL_DURATION = 1.6;

/**
 * The real photo, drawn in WebGL (not as an <img>) so a late reveal never becomes the page's LCP.
 * Shown above the scan line, with a hole where the pointer lens re-digitizes it.
 */
const PHOTO_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vPos;
  void main() {
    vUv = uv;
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const PHOTO_FRAGMENT = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uReveal;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  varying vec2 vUv;
  varying vec2 vPos;
  void main() {
    vec4 c = texture2D(uTex, vUv);
    float revealed = smoothstep(uReveal - 0.012, uReveal + 0.012, vPos.y);
    float lens = smoothstep(${LENS.toFixed(3)}, ${(LENS * 0.45).toFixed(3)}, distance(vPos, uMouse)) * uMouseStrength;
    float a = c.a * revealed * (1.0 - lens);
    if (a < 0.003) discard;
    gl_FragColor = vec4(c.rgb * a, a);
  }
`;

/**
 * Particles fly from a small "model core" sphere to their pixel in the photo, then a scan line
 * sweeps top → bottom: above the line particles dissolve and the real photo shows through.
 * Afterwards particles only reappear inside a lens around the pointer.
 */
const VERTEX = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aColor;
  attribute float aLum;
  attribute float aSeed;
  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uReveal;
  uniform float uInvert;
  uniform vec3 uDim;
  uniform vec3 uMid;
  uniform vec3 uBright;
  uniform float uTrueColor;
  uniform float uGlow;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float delay = aSeed * 0.4;
    float t = clamp((uProgress - delay) / 0.6, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);

    vec3 p = mix(aStart, position, t);
    float swirl = (1.0 - t) * t * 4.0;
    p.xy += vec2(sin(aSeed * 40.0 + uTime * 1.4), cos(aSeed * 33.0 + uTime * 1.2)) * 0.07 * swirl;
    p.xy += vec2(sin(uTime * 1.3 + aSeed * 90.0), cos(uTime * 1.1 + aSeed * 70.0)) * 0.0022 * t;

    float dist = length(p.xy - uMouse);
    float lens = smoothstep(${LENS.toFixed(3)}, ${(LENS * 0.45).toFixed(3)}, dist) * uMouseStrength;

    // Revealed region: above the scan line. There particles survive only inside the pointer lens.
    float revealed = smoothstep(uReveal - 0.012, uReveal + 0.012, position.y);
    float band = smoothstep(0.03, 0.0, abs(position.y - uReveal)) * step(uReveal, ${(IMAGE_TOP + 0.01).toFixed(3)});
    float keep = mix(1.0, lens, revealed);

    float tone = mix(aLum, 1.0 - aLum, uInvert);
    float weight = 0.45 + 0.55 * pow(tone, 0.8);
    vec3 duo = mix(mix(uDim, uMid, smoothstep(0.0, 0.55, aLum)), uBright, smoothstep(0.55, 1.0, aLum));
    vColor = mix(duo, aColor, uTrueColor) + band * uGlow;
    vAlpha = (0.45 + 0.55 * weight) * (0.35 + 0.65 * t) * keep + band * 0.9;

    gl_PointSize = uSize * (0.55 + weight * 0.75 + band * 1.2 + lens * 0.6) * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

type Options = {
  imageUrl: string;
  theme: SceneTheme & { forest: string };
  /** Jump straight to the revealed state (e.g. remount after a theme switch). */
  skipIntro: boolean;
  onReady: () => void;
  onRevealStart: () => void;
  onRevealed: () => void;
  onFail: () => void;
};

function sample(image: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = c.height = GRID;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, GRID, GRID);
  const { data } = ctx.getImageData(0, 0, GRID, GRID);

  const targets: number[] = [];
  const colors: number[] = [];
  const lums: number[] = [];
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const k = (j * GRID + i) * 4;
      if (data[k + 3] < 150) continue;
      const [r, g, b] = [data[k] / 255, data[k + 1] / 255, data[k + 2] / 255];
      const jx = (Math.random() - 0.5) / GRID;
      const jy = (Math.random() - 0.5) / GRID;
      targets.push(i / GRID - 0.5 + jx, 0.5 - j / GRID + jy, 0);
      colors.push(r, g, b);
      lums.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }
  }
  // Stretch luminance between the 2nd and 98th percentile so facial detail survives the dark suit.
  const sorted = [...lums].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const stretched = lums.map((l) => Math.min(1, Math.max(0, (l - lo) / Math.max(hi - lo, 1e-3))));
  return {
    targets: new Float32Array(targets),
    colors: new Float32Array(colors),
    lums: new Float32Array(stretched),
  };
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export async function mountPortraitScene(
  canvas: HTMLCanvasElement,
  { imageUrl, theme, skipIntro, onReady, onRevealStart, onRevealed, onFail }: Options,
) {
  const image = new Image();
  image.decoding = "async";
  image.src = imageUrl;
  await image.decode();

  const light = theme.mode === "light";
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "low-power" });
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) {
    renderer.dispose();
    throw new Error(`software renderer: ${gpu}`);
  }
  renderer.setPixelRatio(pixelRatio);

  const scene = new Scene();
  const camera = new OrthographicCamera(-VIEW_W / 2, VIEW_W / 2, VIEW_H / 2, -VIEW_H / 2, -10, 10);
  camera.position.z = 2;

  const { targets, colors, lums } = sample(image);
  const count = lums.length;
  const starts = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Start on a small sphere: the AI model core, before it becomes a person.
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = 0.12 + Math.random() * 0.04;
    const s = Math.sqrt(1 - u * u);
    starts.set([Math.cos(a) * s * r, 0.08 + u * r, Math.sin(a) * s * r], i * 3);
    seeds[i] = Math.random();
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(targets, 3));
  geo.setAttribute("aStart", new BufferAttribute(starts, 3));
  geo.setAttribute("aColor", new BufferAttribute(colors, 3));
  geo.setAttribute("aLum", new BufferAttribute(lums, 1));
  geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));

  // Dark: forest → ghost → ice hologram, shadows lifted enough that a black outfit still reads. Light: ink → forest → ghost stipple.
  // Both lean partly toward the photo's own colours so the handover to the real image is seamless.
  const uniforms = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: 3 },
    uPixelRatio: { value: pixelRatio },
    uMouse: { value: { x: 9, y: 9 } },
    uMouseStrength: { value: 0 },
    uReveal: { value: 2 },
    uInvert: { value: light ? 1 : 0 },
    uDim: { value: light ? new Color(theme.fg) : new Color(theme.ghost).multiplyScalar(0.6) },
    uMid: { value: new Color(light ? theme.forest : theme.ghost) },
    uBright: { value: new Color(light ? theme.ghost : theme.ice) },
    uTrueColor: { value: light ? 0.45 : 0.3 },
    uGlow: { value: light ? 0 : 0.5 },
  };
  const mat = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: SOFT_POINT_FRAGMENT,
    uniforms,
    defines: light ? { LIGHT: 1 } : {},
    transparent: true,
    depthWrite: false,
    blending: light ? NormalBlending : AdditiveBlending,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 1;
  scene.add(points);

  const texture = new Texture(image);
  texture.colorSpace = NoColorSpace; // output the photo's sRGB values untouched
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const photoGeo = new PlaneGeometry(1, 1);
  const photoMat = new ShaderMaterial({
    vertexShader: PHOTO_VERTEX,
    fragmentShader: PHOTO_FRAGMENT,
    uniforms: {
      uTex: { value: texture },
      uReveal: uniforms.uReveal,
      uMouse: uniforms.uMouse,
      uMouseStrength: uniforms.uMouseStrength,
    },
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    blending: NormalBlending,
  });
  scene.add(new Mesh(photoGeo, photoMat));

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    // Light mode is a stipple print: smaller dots keep facial detail readable.
    uniforms.uSize.value = (w / (GRID * VIEW_W)) * (light ? 1.05 : 1.45);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // Pointer → world + canvas-pixel coordinates; the lens eases in while hovering.
  const mouse = { x: 9, y: 9, inside: false };
  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mouse.inside = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
    mouse.x = (nx - 0.5) * VIEW_W;
    mouse.y = (0.5 - ny) * VIEW_H;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  let frame = 0;
  let visible = true;
  let last = performance.now();
  let time = skipIntro ? REVEAL_START + REVEAL_DURATION : 0;
  let first = true;
  let revealStarted = skipIntro;
  let revealedOnce = false;
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
    time += Math.min(0.05, raw / 1000);
    uniforms.uTime.value = time;
    uniforms.uProgress.value = ease((time - ASSEMBLE_START) / ASSEMBLE_DURATION);

    const reveal = ease((time - REVEAL_START) / REVEAL_DURATION);
    uniforms.uReveal.value = reveal <= 0 ? 2 : IMAGE_TOP + 0.03 - reveal * (IMAGE_TOP - IMAGE_BOTTOM + 0.06);

    const m = uniforms.uMouse.value;
    m.x += (mouse.x - m.x) * 0.2;
    m.y += (mouse.y - m.y) * 0.2;
    uniforms.uMouseStrength.value += ((mouse.inside ? 1 : 0) - uniforms.uMouseStrength.value) * 0.1;

    renderer.render(scene, camera);
    if (first) {
      first = false;
      onReady();
    }
    if (!revealStarted && reveal > 0) {
      revealStarted = true;
      onRevealStart();
    }
    if (!revealedOnce && reveal >= 1) {
      revealedOnce = true;
      onRevealed();
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
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onPointer);
    geo.dispose();
    mat.dispose();
    photoGeo.dispose();
    photoMat.dispose();
    texture.dispose();
    renderer.dispose();
  };
}
