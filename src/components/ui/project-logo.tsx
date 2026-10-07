import Image from "next/image";

/** Nar products share the NarPOS brand; open-source tools use GitHub. */
export function ProjectLogo({ slug, name, className = "h-14 w-20", sizes = "120px" }: { slug: string; name: string; className?: string; sizes?: string }) {
  const brand = slug.startsWith("nar") ? "narpos" : slug === "ai-tooling" || slug === "github" ? "github" : slug;
  const themed = ["github", "narpos", "tezgahtar", "egecocuk"].includes(brand);
  return (
    <span className={`work-logo relative inline-flex shrink-0 items-center justify-center ${className}`}>
      {themed ? (
        <>
          <Image src={`/logos/${brand}-black.png`} alt={`${name} logo`} width={512} height={512} sizes={sizes} unoptimized className="project-logo-light h-full w-full object-contain" />
          <Image src={`/logos/${brand}-white.png`} alt={`${name} logo`} width={512} height={512} sizes={sizes} unoptimized className="project-logo-dark h-full w-full object-contain" />
        </>
      ) : (
        <Image src={`/logos/${brand}.png`} alt={`${name} logo`} width={512} height={512} sizes={sizes} unoptimized className="h-full w-full object-contain" />
      )}
    </span>
  );
}
