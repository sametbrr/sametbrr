import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Self-contained server bundle for the Dokploy Docker image.
  output: "standalone",
  // content/ is read with fs at build time; keep it in the traced output too.
  outputFileTracingIncludes: { "/**": ["./content/**/*"] },
  poweredByHeader: false,
  // app/global-not-found.tsx: the root layout lives under [lang], so unmatched URLs need their own 404.
  experimental: { globalNotFound: true },
};

export default nextConfig;
