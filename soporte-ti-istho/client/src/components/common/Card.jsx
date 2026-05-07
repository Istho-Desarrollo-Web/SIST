export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-navy-700 rounded-xl border border-slate-200 dark:border-navy-600 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
