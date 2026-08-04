import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ label, error, className = '', style, ...props }, ref) {
  return (
    <div className="cx-field">
      {label && <label className="cx-label">{label}</label>}
      <input
        ref={ref}
        {...props}
        className={`cx-input ${className}`}
        style={{ ...(error ? { borderColor: 'var(--color-danger)' } : {}), ...style }}
      />
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  );
});
