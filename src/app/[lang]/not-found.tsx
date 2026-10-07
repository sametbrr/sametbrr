import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container-site flex min-h-svh flex-col items-start justify-center gap-6">
      <p className="font-mono text-sm text-ghost">404</p>
      <h1 className="text-h2">
        Sayfa bulunamadı <span className="text-fg-subtle">/ Page not found</span>
      </h1>
      <Link href="/" className="rounded-full bg-primary px-5 py-3 font-medium text-on-primary transition-colors hover:bg-primary-hover">
        Ana sayfa · Home
      </Link>
    </main>
  );
}
