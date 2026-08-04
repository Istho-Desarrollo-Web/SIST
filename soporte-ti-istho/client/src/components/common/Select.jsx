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
    function onScroll(e) {
      if (dropRef.current && dropRef.current.contains(e.target)) return;
      setOpen(false);
    }
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
    <div ref={dropRef} style={dropStyle} className="cx-select-panel">
      {options.map(opt => {
        const isActive = String(opt.value) === String(value);
        return (
          <div
            key={opt.value}
            onClick={() => { onChange(opt.value); setOpen(false); }}
            className={`cx-select-option${isActive ? ' selected' : ''}`}
          >
            <span>{opt.label}</span>
            {isActive && <Check size={13} style={{ flex: 'none' }} />}
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label className="cx-label" style={{ display: 'block', marginBottom: 4 }}>{label}</label>}

      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`cx-select-trigger${open ? ' open' : ''}`}
        style={{ width: '100%' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={14} />
      </button>

      {createPortal(dropdown, document.body)}
    </div>
  );
}
