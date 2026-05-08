import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const DAYS_HEADER = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function parseValue(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toValue(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDisplay(date) {
  if (!date) return '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function DatePicker({ value, onChange, placeholder = 'dd/mm/aaaa', label }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('day');
  const [display, setDisplay] = useState(() => parseValue(value) || new Date());
  const ref = useRef(null);

  useEffect(() => {
    const d = parseValue(value);
    if (d) setDisplay(d);
  }, [value]);

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setView('day');
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const selected = parseValue(value);
  const today = new Date();
  const year = display.getFullYear();
  const month = display.getMonth();
  const yearStart = Math.floor(year / 12) * 12;

  const prev = () => {
    if (view === 'year') setDisplay(new Date(yearStart - 12, month, 1));
    else if (view === 'month') setDisplay(new Date(year - 1, month, 1));
    else setDisplay(new Date(year, month - 1, 1));
  };
  const next = () => {
    if (view === 'year') setDisplay(new Date(yearStart + 12, month, 1));
    else if (view === 'month') setDisplay(new Date(year + 1, month, 1));
    else setDisplay(new Date(year, month + 1, 1));
  };

  const cycleView = () => setView(v => v === 'day' ? 'month' : v === 'month' ? 'year' : 'day');

  const selectDay = (day) => {
    onChange(toValue(new Date(year, month, day)));
    setOpen(false);
    setView('day');
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const headerLabel =
    view === 'year' ? `${yearStart} – ${yearStart + 11}` :
    view === 'month' ? String(year) :
    `${MONTHS_FULL[month]} ${year}`;

  const fieldCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50';

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
          {label}
        </label>
      )}

      <div
        onClick={() => { setOpen(v => !v); setView('day'); }}
        className={`${fieldCls} flex items-center justify-between gap-2 cursor-pointer select-none`}
      >
        <span className={selected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>
          {selected ? toDisplay(selected) : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 rounded text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={12} />
            </span>
          )}
          <Calendar size={14} className="text-slate-400" />
        </div>
      </div>

      {open && (
        <div className="absolute top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 overflow-hidden">
          {/* Navigation header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-navy-700">
            <button
              onClick={prev}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={cycleView}
              className="text-sm font-bold text-navy-500 dark:text-white hover:text-orange-500 dark:hover:text-orange-400 px-2 py-0.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors"
            >
              {headerLabel}
            </button>
            <button
              onClick={next}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day grid */}
          {view === 'day' && (
            <div className="p-2">
              <div className="grid grid-cols-7 mb-1">
                {DAYS_HEADER.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const isSel = selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
                  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                  return (
                    <button
                      key={i}
                      onClick={() => selectDay(day)}
                      className={`w-full aspect-square rounded-lg text-xs font-medium transition-colors
                        ${isSel
                          ? 'bg-orange-500 text-white'
                          : isToday
                          ? 'border border-orange-400 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-700'}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month grid */}
          {view === 'month' && (
            <div className="p-3 grid grid-cols-3 gap-2">
              {MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  onClick={() => { setDisplay(new Date(year, i, 1)); setView('day'); }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${month === i
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-700'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Year grid */}
          {view === 'year' && (
            <div className="p-3 grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, i) => yearStart + i).map(y => (
                <button
                  key={y}
                  onClick={() => { setDisplay(new Date(y, month, 1)); setView('month'); }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${year === y
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-700'}`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-100 dark:border-navy-700 flex justify-between">
            <button
              onClick={() => { onChange(''); setOpen(false); setView('day'); }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Borrar
            </button>
            <button
              onClick={() => {
                const d = new Date();
                setDisplay(d);
                onChange(toValue(d));
                setOpen(false);
                setView('day');
              }}
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
