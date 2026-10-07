import { buildLlmsTxt } from "@/lib/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt({ full: false }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
