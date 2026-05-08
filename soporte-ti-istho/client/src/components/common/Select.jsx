import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function Select({ value, onChange, options = [], placeholder = 'Seleccionar...', label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors cursor-pointer"
      >
        <span className={`truncate ${selected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1 z-50 w-full bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map(opt => {
              const isActive = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between gap-3 transition-colors
                    ${isActive
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700'}`}
                >
                  <span>{opt.label}</span>
                  {isActive && <Check size={13} className="text-orange-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
