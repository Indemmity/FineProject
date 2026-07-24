"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded p-1 hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((p, idx, arr) => (
            <span key={p} className="flex items-center">
              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-0.5">...</span>}
              <button
                onClick={() => onPageChange(p)}
                className={`rounded px-2 py-0.5 ${
                  p === currentPage
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-secondary"
                }`}
              >
                {p}
              </button>
            </span>
          ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded p-1 hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
