import { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZES = { sm: 360, md: 480, lg: 640 };

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="cx-dialog-backdrop" onClick={onClose}>
      <div
        className="cx-dialog"
        style={{ width: '100%', maxWidth: SIZES[size] ?? SIZES.md, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          <button type="button" onClick={onClose} className="cx-btn cx-btn-ghost cx-btn-icon" style={{ flex: 'none' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
