/**
 * Abbreviate an id for table cells and labels. Short, human-readable ids
 * (≤ 16 chars, e.g. "demo-run", "demo-fork") are shown in full; longer ids
 * (UUIDs) are abbreviated to the first 8 chars + ellipsis.
 */
export function shortId(id: string): string {
  return id.length <= 16 ? id : `${id.slice(0, 8)}…`;
}
