import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold text-neutral-900">Page not found</h1>
      <p className="mt-3 text-neutral-600">The page you&rsquo;re looking for doesn&rsquo;t exist or hasn&rsquo;t been published yet.</p>
      <Link href="/" className="mt-6 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
        Back to homepage
      </Link>
    </div>
  );
}
