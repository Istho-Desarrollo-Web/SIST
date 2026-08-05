import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const DROPDOWN_MAX_H = 224;
const TYPEAHEAD_RESET_MS = 500;

export function Select({ value, onChange, options = [], placeholder = 'Seleccionar...', label }) {
  const [open, setOpen] = useState(false);
  const [dropStyle, setDropStyle] = useState({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef(null);
  const btnRef = useRef(null);
  const dropRef = useRef(null);
  const typeaheadRef = useRef({ text: '', timer: null });
  const listboxId = useId();
  const triggerId = useId();

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

  function computeDropStyle() {
    if (!btnRef.current) return;
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

  function openDropdown() {
    computeDropStyle();
    const selectedIndex = options.findIndex(o => String(o.value) === String(value));
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
  }

  function handleToggle() {
    if (open) closeDropdown();
    else openDropdown();
  }

  function selectOption(index) {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    closeDropdown();
  }

  function moveActive(delta) {
    if (options.length === 0) return;
    setActiveIndex(i => {
      const base = i < 0 ? 0 : i;
      return (base + delta + options.length) % options.length;
    });
  }

  function typeahead(char) {
    const state = typeaheadRef.current;
    clearTimeout(state.timer);
    state.text += char.toLowerCase();
    state.timer = setTimeout(() => { state.text = ''; }, TYPEAHEAD_RESET_MS);

    const match = options.findIndex(o => o.label.toLowerCase().startsWith(state.text));
    if (match >= 0) setActiveIndex(match);
  }

  function handleTriggerKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(options.length > 0 ? 0 : -1);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length > 0 ? options.length - 1 : -1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectOption(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        closeDropdown();
        break;
      case 'Tab':
        closeDropdown();
        break;
      default:
        if (e.key.length === 1) {
          typeahead(e.key);
        }
    }
  }

  const selected = options.find(o => String(o.value) === String(value));
  const activeOptionId = open && activeIndex >= 0 && options[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined;

  const dropdown = open ? (
    <div
      ref={dropRef}
      style={dropStyle}
      className="cx-select-panel"
      role="listbox"
      id={listboxId}
      aria-labelledby={triggerId}
    >
      {options.map((opt, index) => {
        const isSelected = String(opt.value) === String(value);
        const isActive = index === activeIndex;
        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard selection is handled by the trigger button (see handleTriggerKeyDown); this option never receives real DOM focus, only aria-activedescendant highlighting
          <div
            key={opt.value}
            id={`${listboxId}-opt-${index}`}
            role="option"
            tabIndex={-1}
            aria-selected={isSelected}
            onClick={() => selectOption(index)}
            className={`cx-select-option${isSelected ? ' selected' : ''}${isActive ? ' active' : ''}`}
          >
            <span>{opt.label}</span>
            {isSelected && <Check size={13} style={{ flex: 'none' }} />}
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label htmlFor={triggerId} className="cx-label" style={{ display: 'block', marginBottom: 4 }}>{label}</label>}

      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        className={`cx-select-trigger${open ? ' open' : ''}`}
        style={{ width: '100%' }}
        id={triggerId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
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
