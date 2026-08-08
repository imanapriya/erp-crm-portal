import { PaginationMeta } from "../types";

export function Pagination({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) {
  if (meta.totalPages <= 1) return null;

  return (
    <div className="pagination">
      <span>
        Page {meta.page} of {meta.totalPages} &middot; {meta.total} total
      </span>
      <div className="controls">
        <button className="btn btn-secondary btn-sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
          Previous
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
