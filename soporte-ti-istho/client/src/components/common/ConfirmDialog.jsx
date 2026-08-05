import { useId, useRef } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const VARIANTS = {
  danger: { icon: Trash2, iconBg: 'var(--color-danger-subtle-bg)', iconColor: 'var(--color-danger-subtle-text)', confirmVariant: 'danger' },
  warning: { icon: AlertTriangle, iconBg: 'var(--color-warning-subtle-bg)', iconColor: 'var(--color-warning-subtle-text)', confirmVariant: 'primary' },
  info: { icon: Info, iconBg: 'var(--color-info-subtle-bg)', iconColor: 'var(--color-info-subtle-text)', confirmVariant: 'secondary' },
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useDialogFocus(dialogRef, open, onCancel);

  if (!open) return null;

  const { icon: Icon, iconBg, iconColor, confirmVariant } = VARIANTS[variant] ?? VARIANTS.danger;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- click-to-dismiss is a mouse-only convenience; keyboard users close via Escape or Cancel, both already accessible
    <div className="cx-dialog-backdrop" onClick={onCancel}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- stopPropagation only prevents the click from reaching the backdrop above; it is not a user-facing action needing its own keyboard equivalent */}
      <div
        ref={dialogRef}
        className="cx-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        style={{ width: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon size={22} color={iconColor} />
        </div>
        <h3 id={titleId} style={{ fontSize: 16, margin: '0 0 4px' }}>{title}</h3>
        <p id={messageId} className="text-muted" style={{ fontSize: 13, margin: '0 0 20px' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
