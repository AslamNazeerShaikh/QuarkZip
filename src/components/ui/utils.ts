/// shadcn-style class merger (no extra deps): joins truthy fragments.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
