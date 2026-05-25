import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const DROPDOWN_MAX_H = 224;

export function Select({ value, onChange, options = [], placeholder = 'Seleccionar...', label }) {
  const [open, setOpen] = useState(false);
  const [dropStyle, setDropStyle] = useState({});
  const ref = useRef(null);
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (
        ref.current && !ref.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    }
    function onScroll() { setOpen(false); }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < DROPDOWN_MAX_H + 8;
      const minW = rect.width;

      if (openUp) {
        setDropStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          minWidth: minW,
          maxWidth: 320,
          zIndex: 9999,
        });
      } else {
        setDropStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          minWidth: minW,
          maxWidth: 320,
          zIndex: 9999,
        });
      }
    }
    setOpen(v => !v);
  }

  const selected = options.find(o => String(o.value) === String(value));

  const dropdown = open ? (
    <div
      ref={dropRef}
      style={dropStyle}
      className="bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 overflow-hidden"
    >
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
  ) : null;

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

      {createPortal(dropdown, document.body)}
    </div>
  );
}
