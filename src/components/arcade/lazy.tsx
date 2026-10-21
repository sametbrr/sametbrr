"use client";

import dynamic from "next/dynamic";

const Screen = () => <div className="aspect-[16/9] w-full bg-[#06120c]" />;

/** Game code loads only on the client and only where a preview or cabinet is rendered. */
export const LazyArcadePreview = dynamic(() => import("./arcade-preview").then((m) => m.ArcadePreview), {
  ssr: false,
  loading: Screen,
});
export const LazyArcadePlayer = dynamic(() => import("./arcade-player").then((m) => m.ArcadePlayer), {
  ssr: false,
  loading: Screen,
});
