import { useState, useRef, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

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

export function DatePicker({ value, onChange, placeholder = 'dd/mm/aaaa', label, className = '' }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('day');
  const [display, setDisplay] = useState(() => parseValue(value) || new Date());
  const [popupStyle, setPopupStyle] = useState({});
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const popupId = useId();
  const [activeDate, setActiveDate] = useState(() => parseValue(value) || new Date());
  const [prevOpenForActiveDate, setPrevOpenForActiveDate] = useState(open);
  const activeCellRef = useRef(null);

  useEffect(() => {
    const d = parseValue(value);
    if (d) setDisplay(d);
  }, [value]);

  useEffect(() => {
    function onOutside(e) {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
        popupRef.current && !popupRef.current.contains(e.target)
      ) {
        setOpen(false);
        setView('day');
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useDialogFocus(popupRef, open, () => { setOpen(false); setView('day'); });

  useEffect(() => {
    if (open) activeCellRef.current?.focus();
  }, [open, view, activeDate]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupW = 288;
    const spaceRight = window.innerWidth - rect.left;

    const style = {
      position: 'fixed',
      top: rect.bottom + 4,
      zIndex: 9999,
      width: popupW,
      maxWidth: `calc(100vw - 1rem)`,
    };

    if (spaceRight < popupW + 8) {
      style.right = window.innerWidth - rect.right;
    } else {
      style.left = rect.left;
    }

    setPopupStyle(style);
  }, [open]);

  const selected = parseValue(value);

  if (open !== prevOpenForActiveDate) {
    setPrevOpenForActiveDate(open);
    if (open) setActiveDate(selected || new Date());
  }

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

  function moveActiveDay(deltaDays) {
    const next = new Date(activeDate);
    next.setDate(next.getDate() + deltaDays);
    if (next.getMonth() !== display.getMonth() || next.getFullYear() !== display.getFullYear()) {
      setDisplay(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    setActiveDate(next);
  }

  function moveActiveMonthInYear(deltaMonths) {
    const next = new Date(activeDate.getFullYear(), activeDate.getMonth() + deltaMonths, 1);
    const daysInNext = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(activeDate.getDate(), daysInNext));
    setDisplay(new Date(next.getFullYear(), next.getMonth(), 1));
    setActiveDate(next);
  }

  function handleDayKeyDown(e) {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); moveActiveDay(-1); break;
      case 'ArrowRight': e.preventDefault(); moveActiveDay(1); break;
      case 'ArrowUp': e.preventDefault(); moveActiveDay(-7); break;
      case 'ArrowDown': e.preventDefault(); moveActiveDay(7); break;
      case 'Home': {
        e.preventDefault();
        moveActiveDay(-activeDate.getDay());
        break;
      }
      case 'End': {
        e.preventDefault();
        moveActiveDay(6 - activeDate.getDay());
        break;
      }
      case 'PageUp':
        e.preventDefault();
        moveActiveMonthInYear(e.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        e.preventDefault();
        moveActiveMonthInYear(e.shiftKey ? 12 : 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectDay(activeDate.getDate());
        break;
      default:
        break;
    }
  }

  function moveActiveMonthCell(delta) {
    const m = ((activeDate.getMonth() + delta) % 12 + 12) % 12;
    setActiveDate(new Date(activeDate.getFullYear(), m, 1));
  }

  function handleMonthKeyDown(e) {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); moveActiveMonthCell(-1); break;
      case 'ArrowRight': e.preventDefault(); moveActiveMonthCell(1); break;
      case 'ArrowUp': e.preventDefault(); moveActiveMonthCell(-3); break;
      case 'ArrowDown': e.preventDefault(); moveActiveMonthCell(3); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setDisplay(new Date(activeDate.getFullYear(), activeDate.getMonth(), 1));
        setView('day');
        break;
      default:
        break;
    }
  }

  function moveActiveYearCell(delta) {
    const currentYearStart = Math.floor(activeDate.getFullYear() / 12) * 12;
    const offset = activeDate.getFullYear() - currentYearStart;
    const nextOffset = ((offset + delta) % 12 + 12) % 12;
    setActiveDate(new Date(currentYearStart + nextOffset, activeDate.getMonth(), 1));
  }

  function handleYearKeyDown(e) {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); moveActiveYearCell(-1); break;
      case 'ArrowRight': e.preventDefault(); moveActiveYearCell(1); break;
      case 'ArrowUp': e.preventDefault(); moveActiveYearCell(-3); break;
      case 'ArrowDown': e.preventDefault(); moveActiveYearCell(3); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setDisplay(new Date(activeDate.getFullYear(), activeDate.getMonth(), 1));
        setView('month');
        break;
      default:
        break;
    }
  }

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

  const navUnitLabel = view === 'year' ? 'Década' : view === 'month' ? 'Año' : 'Mes';

  const fieldCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800';

  const popup = open ? (
    <div
      ref={popupRef}
      id={popupId}
      style={popupStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar fecha"
      className="bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 overflow-hidden"
    >
      {/* Navigation header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-navy-700">
        <button
          onClick={prev}
          aria-label={`${navUnitLabel} anterior`}
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
          aria-label={`${navUnitLabel} siguiente`}
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
              const isActiveCell = activeDate.getFullYear() === year && activeDate.getMonth() === month && activeDate.getDate() === day;
              return (
                <button
                  key={i}
                  ref={isActiveCell ? activeCellRef : undefined}
                  tabIndex={isActiveCell ? 0 : -1}
                  onClick={() => selectDay(day)}
                  onKeyDown={handleDayKeyDown}
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
          {MONTHS_SHORT.map((m, i) => {
            const isActiveCell = activeDate.getFullYear() === year && activeDate.getMonth() === i;
            return (
              <button
                key={m}
                ref={isActiveCell ? activeCellRef : undefined}
                tabIndex={isActiveCell ? 0 : -1}
                onClick={() => { setDisplay(new Date(year, i, 1)); setActiveDate(new Date(year, i, 1)); setView('day'); }}
                onKeyDown={handleMonthKeyDown}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${month === i
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-700'}`}
              >
                {m}
              </button>
            );
          })}
        </div>
      )}

      {/* Year grid */}
      {view === 'year' && (
        <div className="p-3 grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, i) => yearStart + i).map(y => {
            const isActiveCell = activeDate.getFullYear() === y;
            return (
              <button
                key={y}
                ref={isActiveCell ? activeCellRef : undefined}
                tabIndex={isActiveCell ? 0 : -1}
                onClick={() => { setDisplay(new Date(y, month, 1)); setActiveDate(new Date(y, month, 1)); setView('month'); }}
                onKeyDown={handleYearKeyDown}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${year === y
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-700'}`}
              >
                {y}
              </button>
            );
          })}
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
  ) : null;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
          {label}
        </label>
      )}

      <div className={`${fieldCls} flex items-center justify-between gap-2`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => { setOpen(v => !v); setView('day'); }}
          className="flex-1 min-w-0 flex items-center bg-transparent border-0 p-0 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 rounded"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popupId : undefined}
        >
          <span className={selected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>
            {selected ? toDisplay(selected) : placeholder}
          </span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Borrar fecha"
              className="p-0.5 rounded text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={12} />
            </button>
          )}
          <Calendar size={14} className="text-slate-400" aria-hidden="true" />
        </div>
      </div>

      {createPortal(popup, document.body)}
    </div>
  );
}
