import Link from "next/link";

// This renders inside whichever layout is already mounted for the segment
// notFound() was thrown from (or, for a fully unmatched URL, the app's only
// root-level route group, app/(public)) — that layout already supplies the
// site header/footer. Rendering another pair here would double them up.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
      <span aria-hidden className="font-display text-6xl font-medium text-primary/30">
        404
      </span>
      <h1 className="mt-4 font-display text-3xl font-medium text-foreground">Page not found</h1>
      <p className="mt-3 text-muted">The page you&rsquo;re looking for doesn&rsquo;t exist or hasn&rsquo;t been published yet.</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
      >
        Back to homepage
      </Link>
    </main>
  );
}
