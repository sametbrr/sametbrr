/** Palette passed from CSS tokens so canvas scenes follow the active theme. */
export type SceneTheme = { mode: "dark" | "light"; ice: string; ghost: string; fg: string };

// Dark: additive glow (premultiplied). Light: normal blending (straight alpha), since light can't add onto white.
export const SOFT_POINT_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.6) * vAlpha;
    if (a < 0.01) discard;
    #ifdef LIGHT
      gl_FragColor = vec4(vColor, min(a, 1.0));
    #else
      gl_FragColor = vec4(vColor * a, a);
    #endif
  }
`;

/**
 * Frame-time watchdog: skips warm-up frames (shader compile, image decode) and gaps from
 * throttled/background tabs, then fails if the median of the sampled frames is too slow.
 */
export function createFrameProbe({ warmup = 10, samples = 40, budgetMs = 50 } = {}) {
  let seen = 0;
  const times: number[] = [];
  return (frameMs: number): "probing" | "ok" | "fail" => {
    if (times.length >= samples) return "ok";
    if (++seen <= warmup || frameMs > 250) return "probing";
    times.push(frameMs);
    if (times.length < samples) return "probing";
    const median = [...times].sort((a, b) => a - b)[samples >> 1];
    return median > budgetMs ? "fail" : "ok";
  };
}
