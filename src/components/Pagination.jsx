import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, totalPages, total, limit, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Buat array nomor halaman yang cerdas
  function getPageNumbers() {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, page + 2);

      if (page <= 3) {
        start = 1;
        end = maxVisible;
      } else if (page >= totalPages - 2) {
        start = totalPages - maxVisible + 1;
        end = totalPages;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }

  return (
    <nav className="pagination-nav" aria-label="Navigasi Halaman" data-testid="report-pagination">
      {total > 0 && (
        <p className="pagination-info">
          Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari{' '}
          <strong>{total}</strong> laporan
        </p>
      )}

      <div className="pagination-controls">
        <button
          type="button"
          className="btn-page btn-prev"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman Sebelumnya"
          data-testid="pagination-previous"
        >
          <ChevronLeft size={16} aria-hidden="true" /> Sebelumnya
        </button>

        <div className="page-numbers">
          {getPageNumbers().map((item, index) => {
            if (item === '...') {
              return (
                <span key={`ellipsis-${index}`} className="page-ellipsis">
                  &hellip;
                </span>
              );
            }
            const isActive = item === page;
            return (
              <button
                key={`page-${item}`}
                type="button"
                className={`btn-page-number ${isActive ? 'active' : ''}`}
                onClick={() => onPageChange(item)}
                aria-current={isActive ? 'page' : undefined}
                data-testid={`pagination-page-${item}`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="btn-page btn-next"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman Berikutnya"
          data-testid="pagination-next"
        >
          Berikutnya <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
