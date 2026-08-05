import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '16px 0' }}>
      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior">
        <ChevronLeft size={14} />
      </button>
      <span className="text-muted" style={{ fontSize: 12 }}>Página {page} de {totalPages}</span>
      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Página siguiente">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
