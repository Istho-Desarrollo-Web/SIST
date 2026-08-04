const VARIANTS = {
  default: 'cx-tag-neutral',
  success: 'cx-tag-success',
  warning: 'cx-tag-warning',
  danger: 'cx-tag-danger',
  info: 'cx-tag-info',
  orange: 'cx-tag-accent',
};

export function Badge({ children, variant, className = '' }) {
  const variantClass = variant ? (VARIANTS[variant] ?? VARIANTS.default) : '';
  return (
    <span className={`cx-tag ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
