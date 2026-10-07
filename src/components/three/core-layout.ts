/**
 * Shared geometry for the hero "Model Core + Tool Orbit" scene (DESIGN.md §7).
 * Used by both the three.js scene and the static SVG poster, so both draw the same picture.
 * No three.js imports here: the poster must not pull the 3D chunk.
 */

export type Vec3 = { x: number; y: number; z: number };

export const CORE_RADIUS = 1.15;
export const CAMERA_Z = 6.4;
export const TILT_X = 0.22;

/** Tool layers around the model. Satellites are MCP-style tools the agent calls. */
export const ORBITS = [
  { radius: 1.85, tilt: [0.32, 0, 0.55] as const, speed: 0.22, satellites: 3 },
  { radius: 2.4, tilt: [-0.4, 0, -0.32] as const, speed: -0.15, satellites: 4 },
  { radius: 2.95, tilt: [0.14, 0, 0.12] as const, speed: 0.1, satellites: 5 },
];

/** Evenly distributed points on a sphere (Fibonacci lattice). */
export function fibonacciSphere(count: number, radius: number): Vec3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = golden * i;
    return { x: Math.cos(a) * r * radius, y: y * radius, z: Math.sin(a) * r * radius };
  });
}

/** Point on an orbit at `angle`, tilted by the orbit's Euler angles (applied Z, then Y, then X). */
export function orbitPoint(orbit: (typeof ORBITS)[number], angle: number): Vec3 {
  let x = Math.cos(angle) * orbit.radius;
  let y = 0;
  let z = Math.sin(angle) * orbit.radius;
  const [rx, ry, rz] = orbit.tilt;
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  return { x, y, z };
}

export const satelliteAngle = (orbitIndex: number, i: number, time: number) =>
  (i / ORBITS[orbitIndex].satellites) * Math.PI * 2 + orbitIndex * 0.7 + time * ORBITS[orbitIndex].speed;

/** Perspective projection matching the 3D camera (scene rotated by rotY, tilted by TILT_X). */
export function project(p: Vec3, rotY = 0.35) {
  const cy = Math.cos(rotY);
  const sy = Math.sin(rotY);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  const ct = Math.cos(TILT_X);
  const st = Math.sin(TILT_X);
  const y2 = p.y * ct - z1 * st;
  const z2 = p.y * st + z1 * ct;
  const f = CAMERA_Z / (CAMERA_Z - z2);
  return { x: x1 * f, y: -y2 * f, depth: z2 };
}
