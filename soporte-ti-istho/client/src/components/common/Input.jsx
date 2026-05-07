import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <input
        ref={ref}
        {...props}
        className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors
          bg-white dark:bg-navy-800 text-slate-900 dark:text-white
          border-slate-300 dark:border-navy-500
          focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
          ${className}`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});
