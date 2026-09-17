import "server-only";
import type { StoredArticleImage } from "./types";

const SEARCH_URL = "https://api.pexels.com/v1/search";

interface PexelsPhoto {
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: { large: string };
  alt: string | null;
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

// Process-lifetime cache keyed by search query, so regenerating the same
// keyword (or two pages that happen to derive the same query) within one
// running instance doesn't spend a second Pexels request on an identical
// search — real caching value is limited at this app's ~1-2 generations/day
// volume, but it's free and correct to do.
const queryCache = new Map<string, StoredArticleImage | null>();

function toStoredImage(photo: PexelsPhoto, query: string): StoredArticleImage {
  return {
    url: photo.src.large,
    width: photo.width,
    height: photo.height,
    // Pexels' own alt text is often just a generic scene description — fall
    // back to a query-based description rather than leaving it empty, but
    // never claim the photo depicts the specific reviewed product (it's
    // illustrative stock photography, not a photo of the tested unit).
    alt: photo.alt?.trim() || `Illustrative photo related to ${query}`,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    pexelsUrl: photo.url,
  };
}

/**
 * Searches Pexels for a single relevant landscape photo. Server-only: the API
 * key never leaves this module. Returns null (never a fabricated image URL or
 * placeholder) on missing config, no results, rate limiting, or any other
 * failure — the caller must treat the image as optional, not a publish gate.
 */
export async function searchLandscapeImage(query: string): Promise<StoredArticleImage | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (queryCache.has(trimmed)) {
    return queryCache.get(trimmed) ?? null;
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return null;
  }

  const url = `${SEARCH_URL}?query=${encodeURIComponent(trimmed)}&orientation=landscape&per_page=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      // Includes 401 (bad key) and 429 (rate limited) — both are "no image this
      // time", never an error surfaced to the reader or a reason to fail the
      // article.
      queryCache.set(trimmed, null);
      return null;
    }

    const body = (await response.json()) as PexelsSearchResponse;
    const photo = body.photos?.[0];
    if (!photo) {
      queryCache.set(trimmed, null);
      return null;
    }

    const image = toStoredImage(photo, trimmed);
    queryCache.set(trimmed, image);
    return image;
  } catch {
    clearTimeout(timeout);
    queryCache.set(trimmed, null);
    return null;
  }
}

/** Derives a concrete, Pexels-friendly search query from the article's own
 * subject rather than a full sentence — short, concrete queries return more
 * relevant stock photos than long or punctuated ones. */
export function buildImageSearchQuery(params: { keyword?: string | null; brand?: string | null; category?: string | null }): string {
  const { keyword, brand, category } = params;
  if (brand) return category ? `${brand} ${category}` : brand;
  if (keyword) return keyword;
  return category ?? "";
}
