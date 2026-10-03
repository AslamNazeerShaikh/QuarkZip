import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZES = [100, 1000, 5000, 10000] as const;
export type PageSize = (typeof PAGE_SIZES)[number] | "all";

/// Floating pagination controls: per-page selector, prev/next, page readout.
/// Same pill language and 36px height as the theme switch.
export default function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: PageSize;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (s: PageSize) => void;
}) {
  return (
    <div className="flex h-9 items-center gap-1 rounded-full border border-[var(--qz-border)] bg-[var(--qz-surface)]/80 px-1 shadow-lg backdrop-blur">
      <select
        aria-label="Rows per page"
        value={String(pageSize)}
        onChange={(e) => {
          const v = e.target.value;
          onPageSize(v === "all" ? "all" : Number(v) as PageSize);
        }}
        className="h-7 cursor-pointer rounded-full bg-transparent px-2 text-[var(--qz-muted)] outline-none hover:text-[var(--qz-text)]"
      >
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size.toLocaleString("en-US")}
          </option>
        ))}
        <option value="all">All</option>
      </select>
      <button
        type="button"
        aria-label="Previous page"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className="rounded-full p-1.5 text-[var(--qz-muted)] transition-colors hover:text-[var(--qz-text)] disabled:opacity-30"
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      <span className="min-w-16 text-center text-[var(--qz-muted)] tabular-nums">
        {pageCount === 0
          ? "0 / 0"
          : `${(page + 1).toLocaleString("en-US")} / ${pageCount.toLocaleString("en-US")}`}
      </span>
      <button
        type="button"
        aria-label="Next page"
        disabled={pageCount === 0 || page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
        className="rounded-full p-1.5 text-[var(--qz-muted)] transition-colors hover:text-[var(--qz-text)] disabled:opacity-30"
      >
        <ChevronRight size={16} aria-hidden />
      </button>
      <span className="hidden pr-2 text-[var(--qz-muted)] tabular-nums min-[1100px]:inline">
        {total.toLocaleString("en-US")}
      </span>
    </div>
  );
}
