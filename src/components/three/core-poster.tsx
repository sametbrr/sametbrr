import { CORE_RADIUS, ORBITS, fibonacciSphere, orbitPoint, project, satelliteAngle } from "./core-layout";

const SCALE = 105;

/** Static SVG of the Model Core scene — the LCP-safe poster and reduced-motion fallback. */
export function CorePoster() {
  const core = fibonacciSphere(420, CORE_RADIUS).map((p) => project(p));
  const rings = ORBITS.map((orbit) =>
    Array.from({ length: 72 }, (_, i) => project(orbitPoint(orbit, (i / 72) * Math.PI * 2)))
      .map((p) => `${(p.x * SCALE).toFixed(1)},${(p.y * SCALE).toFixed(1)}`)
      .join(" "),
  );
  const satellites = ORBITS.flatMap((orbit, oi) =>
    Array.from({ length: orbit.satellites }, (_, si) => project(orbitPoint(orbit, satelliteAngle(oi, si, 0)))),
  );

  return (
    <svg viewBox="-420 -300 840 600" preserveAspectRatio="xMidYMid meet" className="size-full">
      <defs>
        <radialGradient id="core-light">
          <stop offset="0" stopColor="#2457FF" stopOpacity="0.4" />
          <stop offset="1" stopColor="#2457FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={CORE_RADIUS * SCALE * 1.9} fill="url(#core-light)" />
      {rings.map((points, i) => (
        <polygon key={i} points={points} fill="none" className="stroke-fg/10" />
      ))}
      <g className="fill-ice">
        {core.map((p, i) => (
          <circle
            key={i}
            cx={(p.x * SCALE).toFixed(1)}
            cy={(p.y * SCALE).toFixed(1)}
            r="1.1"
            fillOpacity={(0.15 + 0.6 * ((p.depth / CORE_RADIUS + 1) / 2)).toFixed(2)}
          />
        ))}
      </g>
      {satellites.map((p, i) => (
        <circle key={i} cx={p.x * SCALE} cy={p.y * SCALE} r="3" className="fill-ghost" fillOpacity="0.85" />
      ))}
    </svg>
  );
}
