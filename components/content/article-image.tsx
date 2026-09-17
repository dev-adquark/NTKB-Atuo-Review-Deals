import Image from "next/image";
import type { StoredArticleImage } from "@/lib/pexels/types";

/** Renders the article's illustrative photo with required Pexels attribution.
 * Never rendered at all when no image was found — see lib/pexels/client.ts. */
export function ArticleImage({ image }: { image: StoredArticleImage }) {
  return (
    <figure className="mx-auto max-w-3xl px-4 pt-8">
      <div className="overflow-hidden rounded-2xl border border-border-default">
        <Image
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(min-width: 768px) 48rem, 100vw"
          className="h-auto w-full object-cover"
          priority
        />
      </div>
      <figcaption className="mt-2 text-xs text-muted">
        Photo by{" "}
        <a href={image.photographerUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {image.photographer}
        </a>{" "}
        on{" "}
        <a href={image.pexelsUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Pexels
        </a>
      </figcaption>
    </figure>
  );
}
