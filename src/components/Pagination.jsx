import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export function Pagination({ total, page, perPage, onPageChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between pt-3 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
        {start}–{end} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft size={14} />
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={14} />
        </Button>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', padding: '0 0.75rem', textAlign: 'center', minWidth: '4.5rem' }}>
          {page} / {totalPages}
        </span>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={14} />
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronsRight size={14} />
        </Button>
      </div>
    </div>
  );
}
