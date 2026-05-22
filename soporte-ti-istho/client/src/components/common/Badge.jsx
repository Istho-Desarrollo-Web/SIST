const VARIANTS = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  danger:  'bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-300',
  info:    'bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-300',
  orange:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

export function Badge({ children, variant = 'default', className = '' }) {
  const base = VARIANTS[variant] ?? VARIANTS.default;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${base} ${className}`}>
      {children}
    </span>
  );
}
