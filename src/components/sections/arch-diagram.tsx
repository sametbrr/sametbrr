import type { CaseStudy } from "@/lib/content/schema";

const W = 400;
const ROW = 62;

/**
 * Layered architecture diagram from a case study's `architecture` field.
 * Edges use pathLength="1" so CSS can "draw" them: on card hover (W2) or
 * when the parent sets data-drawn="true" (D1). See .arch-edge in globals.css.
 */
export function ArchDiagram({
  architecture,
  size = "sm",
  className = "",
}: {
  architecture: NonNullable<CaseStudy["architecture"]>;
  size?: "sm" | "lg";
  className?: string;
}) {
  const layers = [0, 1, 2, 3].map((l) => architecture.nodes.filter((n) => n.layer === l));
  const usedLayers = layers.filter((l) => l.length).length;
  const H = usedLayers * ROW;
  const pos = new Map<string, { x: number; y: number }>();
  let row = 0;
  for (const layer of layers) {
    if (!layer.length) continue;
    layer.forEach((n, i) => pos.set(n.id, { x: ((i + 0.5) / layer.length) * W, y: row * ROW + ROW / 2 }));
    row++;
  }
  const lg = size === "lg";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full ${className}`}
      role="img"
      aria-label={architecture.nodes.map((n) => n.label).join(", ")}
    >
      {architecture.edges.map(([a, b], i) => {
        const p = pos.get(a);
        const q = pos.get(b);
        if (!p || !q) return null;
        const midY = (p.y + q.y) / 2;
        const d = `M${p.x} ${p.y} C${p.x} ${midY} ${q.x} ${midY} ${q.x} ${q.y}`;
        return (
          <g key={i} fill="none">
            <path d={d} className="stroke-fg/10" strokeWidth={1} />
            <path d={d} pathLength={1} className="arch-edge" style={{ transitionDelay: `${i * 40}ms` }} />
          </g>
        );
      })}
      {architecture.nodes.map((n, i) => {
        const p = pos.get(n.id)!;
        const w = Math.max(54, n.label.length * (lg ? 7.4 : 6.6) + 18);
        return (
          <g
            key={n.id}
            transform={`translate(${p.x} ${p.y})`}
            className="arch-node"
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <rect x={-w / 2} y={-12} width={w} height={24} rx={12} className="fill-void" />
            <rect
              x={-w / 2}
              y={-12}
              width={w}
              height={24}
              rx={12}
              // Every node starts neutral; the whole diagram turns green together on hover (globals.css).
              className="arch-tag fill-surface-2 stroke-line-strong"
              strokeWidth={1}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="arch-label font-mono fill-fg-muted"
              fontSize={lg ? 11 : 10}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
