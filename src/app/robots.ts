import type { MetadataRoute } from "next";
import { getProfile } from "@/lib/content/load";

export default function robots(): MetadataRoute.Robots {
  const base = getProfile().url;
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${base}/sitemap.xml` };
}
