const VARIANTS = {
  primary: 'cx-btn-primary',
  secondary: 'cx-btn-secondary',
  outline: 'cx-btn-secondary',
  ghost: 'cx-btn-ghost',
  danger: 'cx-btn-danger',
  success: 'cx-btn-success',
};

const SIZE_STYLE = {
  sm: { fontSize: 12, padding: '6px 12px' },
  md: undefined,
  lg: { fontSize: 15, padding: '12px 20px' },
};

export function Button({ children, variant = 'primary', size = 'md', className = '', style, loading, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`cx-btn ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`}
      style={{ ...SIZE_STYLE[size], ...style }}
    >
      {loading && <span className="cx-spinner" style={{ width: 14, height: 14 }} />}
      {children}
    </button>
  );
}
