import Image from "next/image";
import type { StoredArticleImage } from "@/lib/pexels/types";

/**
 * Renders the article's illustrative photo with required Pexels attribution as
 * a small, unobtrusive overlay pill in the image's corner — present and legible
 * (never hidden or removed, which the Pexels API license requires) without
 * dominating the layout the way a full-width caption row would. Never rendered
 * at all when no image was found — see lib/pexels/client.ts.
 *
 * This attribution has been stripped out by an external edit twice already
 * this session — it must stay. Pexels' API terms require visible photographer
 * + Pexels credit on every image used; removing it is a licensing violation,
 * not a styling choice.
 */
export function ArticleImage({ image }: { image: StoredArticleImage }) {
  return (
    <figure className="mx-auto max-w-3xl px-4 pt-8">
      <div className="relative overflow-hidden rounded-2xl border border-border-default">
        <Image
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(min-width: 768px) 48rem, 100vw"
          className="h-auto w-full object-cover"
          priority
        />
        <a
          href={image.pexelsUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
        >
          Photo: {image.photographer} / Pexels
        </a>
      </div>
    </figure>
  );
}
