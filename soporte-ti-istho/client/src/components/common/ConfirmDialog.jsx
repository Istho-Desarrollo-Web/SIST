import { useEffect } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Button } from './Button';

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const { icon: Icon, iconBg, iconColor, confirmVariant } = VARIANTS[variant] ?? VARIANTS.danger;

  return (
    <div className="cx-dialog-backdrop" onClick={onCancel}>
      <div className="cx-dialog" style={{ width: 360 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon size={22} color={iconColor} />
        </div>
        <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>{title}</h3>
        <p className="text-muted" style={{ fontSize: 13, margin: '0 0 20px' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
