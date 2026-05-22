import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const DROPDOWN_MAX_H = 224; // max-h-56
const DROPDOWN_MAX_W = 320; // max-w-xs

export function Select({ value, onChange, options = [], placeholder = 'Seleccionar...', label }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [openLeft, setOpenLeft] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < DROPDOWN_MAX_H + 8);
      setOpenLeft(window.innerWidth - rect.left < DROPDOWN_MAX_W);
    }
    setOpen(v => !v);
  }

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
          {label}
        </label>
      )}

      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
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
        <div className={`absolute z-50 min-w-full w-max max-w-xs bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 overflow-hidden
          ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}
          ${openLeft ? 'right-0' : 'left-0'}`}>
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
