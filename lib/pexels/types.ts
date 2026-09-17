/** Image metadata actually persisted alongside a GeneratedPage's content. Never
 * includes the Pexels API key — only what's needed to render the image and its
 * required attribution. */
export interface StoredArticleImage {
  url: string;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
}
