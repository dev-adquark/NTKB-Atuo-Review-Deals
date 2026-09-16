/** Runs `worker` over `items` with at most `limit` in flight at once. One item's
 * rejection never stops or hides the others — each result is captured independently. */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<Array<{ item: T; result?: R; error?: unknown }>> {
  const results: Array<{ item: T; result?: R; error?: unknown }> = new Array(items.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    const index = nextIndex++;
    if (index >= items.length) return;
    const item = items[index];
    try {
      const result = await worker(item);
      results[index] = { item, result };
    } catch (error) {
      results[index] = { item, error };
    }
    await runNext();
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => runNext());
  await Promise.all(workers);
  return results;
}
