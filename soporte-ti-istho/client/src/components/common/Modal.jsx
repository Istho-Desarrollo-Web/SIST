import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const SIZES = { sm: 360, md: 480, lg: 640 };

export function Modal({ open, onClose, title, children, size = 'md' }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useDialogFocus(dialogRef, open, onClose);

  if (!open) return null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- click-to-dismiss is a mouse-only convenience; keyboard users close via Escape or the close button, both already accessible
    <div className="cx-dialog-backdrop" onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- stopPropagation only prevents the click from reaching the backdrop above; it is not a user-facing action needing its own keyboard equivalent */}
      <div
        ref={dialogRef}
        className="cx-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width: '100%', maxWidth: SIZES[size] ?? SIZES.md, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <h3 id={titleId} style={{ margin: 0, fontSize: 17, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="cx-btn cx-btn-ghost cx-btn-icon" style={{ flex: 'none' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
