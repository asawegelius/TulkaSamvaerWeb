/**
 * Keys for changes that are waiting for the API. Each running or queued change
 * adds its key once and removes it once when it finishes, so overlapping
 * changes (two claims, or claim then give back on the same item) stay correct.
 */
export const pendingKeys = {
  rsvp: (eventId: string) => `rsvp:${eventId}`,
  item: (itemId: string) => `item:${itemId}`,
  addItem: (eventId: string) => `add-item:${eventId}`,
} as const;

/** Removes one occurrence of `key`. */
export function withoutOnce(keys: readonly string[], key: string): string[] {
  const index = keys.indexOf(key);
  return index === -1 ? [...keys] : [...keys.slice(0, index), ...keys.slice(index + 1)];
}
