# Centhrix Shared Components Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 5 highest-leverage shared UI components (`Modal`, `ConfirmDialog`, `Select`, `DatePicker`, `Pagination`) keyboard-operable and screen-reader-accessible, and lock the fix in with `eslint-plugin-jsx-a11y`.

**Architecture:** One new shared hook (`useDialogFocus`) handles focus-trap/Escape/restore for both dialog components. `Select` and `DatePicker` each get a hand-rolled WAI-ARIA-pattern rewrite of their open/navigate/select logic (no new UI-behavior library — this codebase has none, and the project's minimalist convention is to keep hand-rolling interaction logic the way `Select`/`DatePicker`/`Modal` already do). `Pagination` gets two `aria-label`s. `eslint-plugin-jsx-a11y` locks in the 5 fixed files at `error` severity and warns everywhere else.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, Centhrix `cx-*` design system, `eslint-plugin-jsx-a11y@6.10.2`.

## Global Constraints

- No hay framework de test automatizado en `soporte-ti-istho/client/` (sin Jest/Vitest, solo ESLint) — la verificación de cada tarea es `npm run build` + inspección manual + (desde la Tarea 6) `npm run lint`.
- No se agrega ninguna librería de comportamiento de UI (focus-trap, combobox, date-picker) — todo el manejo de foco/teclado se escribe a mano, siguiendo el patrón ya establecido por `Select.jsx`/`DatePicker.jsx`/`Modal.jsx`.
- No se toca el CSS visual heredado de `DatePicker.jsx` (clases Tailwind `bg-white dark:bg-navy-800`, `border-slate-300`, etc.) — ya se decidió que su migración visual a `cx-*` es un spec aparte.
- `eslint-plugin-jsx-a11y@6.10.2` no declara soporte de peer-dependency para `eslint@^10` (el que usa el proyecto) — se instala con `--legacy-peer-deps`. Verificado empíricamente: el paquete se instala y su export `flatConfigs.recommended` (`{ languageOptions, plugins, rules }`, 34 reglas) funciona igual que con cualquier otra versión de ESLint 9+ que ya usan `eslint-plugin-react-hooks`/`eslint-plugin-react-refresh` en este mismo `eslint.config.js`.
- **`npm run lint` ya falla hoy, en `main`, sin ningún cambio de este plan** — verificado empíricamente: 23 errores y 2 warnings preexistentes, repartidos en 15 archivos (`DatePicker.jsx` entre ellos — 1 error, línea 35, en el efecto `useEffect(() => { const d = parseValue(value); if (d) setDisplay(d); }, [value]);`, que este plan **no toca**), ninguno relacionado con accesibilidad (son `no-unused-vars`, `no-empty`, `react-hooks/set-state-in-effect`, `react-refresh/only-export-components`, `no-useless-assignment`, `react-hooks/exhaustive-deps`). La Tarea 6 no puede ni debe exigir que `npm run lint` termine en verde global — solo que los 5 archivos de este plan queden sin problemas propios y que ninguna regla `jsx-a11y/*` aparezca en la salida completa.
- Todo el código nuevo de este plan fue verificado línea por línea contra un `eslint` real (`eslint@10.8.0` + `eslint-plugin-jsx-a11y@6.10.2` + `eslint-plugin-react-hooks@7.1.1`, las mismas versiones que usa el proyecto) en un directorio de prueba aislado — no es código sin probar contra el linter real.
- Fuera de alcance (documentado, no tocar en este plan): el patrón `<div onClick>` a nivel de página (Dashboard, Solicitudes, `PDFMapper`), botones de ícono sin `aria-label` en páginas, alternativa de teclado para el drag-and-drop de `PDFMapper.jsx`, auditoría de contraste de color.

---

### Task 1: Hook `useDialogFocus` + `Modal.jsx` + `ConfirmDialog.jsx`

**Files:**
- Create: `soporte-ti-istho/client/src/hooks/useDialogFocus.js`
- Modify: `soporte-ti-istho/client/src/components/common/Modal.jsx` (todo el archivo, 33 líneas)
- Modify: `soporte-ti-istho/client/src/components/common/ConfirmDialog.jsx` (todo el archivo, 47 líneas)

**Interfaces:**
- Produces: `useDialogFocus(dialogRef, open, onClose)` — hook sin valor de retorno. `dialogRef` es un `useRef(null)` que el llamador conecta al contenedor raíz del diálogo (el elemento con `role="dialog"`/`role="alertdialog"`). `open`/`onClose` son los mismos props que ya reciben `Modal`/`ConfirmDialog`. Task 3 (DatePicker) también lo consume — misma firma.
- Consumes: nada de tareas anteriores (es la primera tarea del plan).

- [ ] **Step 1: Crear el hook `useDialogFocus`**

Crear `soporte-ti-istho/client/src/hooks/useDialogFocus.js`:

```js
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(dialogRef, open, onClose) {
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement;

    const node = dialogRef.current;
    const focusables = node ? Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR)) : [];
    if (focusables.length > 0) {
      focusables[0].focus();
    } else if (node) {
      node.setAttribute('tabindex', '-1');
      node.focus();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const current = node ? Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR)) : [];
      if (current.length === 0) return;

      const first = current[0];
      const last = current[current.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, dialogRef]);
}
```

Nota sobre `onCloseRef`: `onClose` casi siempre es una función inline nueva en cada render del componente padre (`onClose={() => setOpen(false)}`). Si se pusiera `onClose` directo en el arreglo de dependencias del segundo `useEffect`, el efecto se re-ejecutaría en cada render mientras el diálogo está abierto — y como el efecto mueve el foco al primer elemento enfocable cada vez que corre, eso robaría el foco del campo donde el usuario esté escribiendo dentro del diálogo. El `onCloseRef` evita ese problema: el segundo efecto solo depende de `[open, dialogRef]` (ambos estables mientras el diálogo permanece abierto), y siempre lee la versión más reciente de `onClose` a través del ref.

- [ ] **Step 2: Reescribir `Modal.jsx`**

Reemplazar el archivo completo `soporte-ti-istho/client/src/components/common/Modal.jsx`:

```jsx
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const SIZES = { sm: 360, md: 480, lg: 640 };

export function Modal({ open, onClose, title, children, size = 'md' }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useDialogFocus(dialogRef, open, onClose);

  if (!open) return null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- click-to-dismiss is a mouse-only convenience; keyboard users close via Escape or the close button, both already accessible
    <div className="cx-dialog-backdrop" onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- stopPropagation only prevents the click from reaching the backdrop above; it is not a user-facing action needing its own keyboard equivalent */}
      <div
        ref={dialogRef}
        className="cx-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width: '100%', maxWidth: SIZES[size] ?? SIZES.md, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <h3 id={titleId} style={{ margin: 0, fontSize: 17, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="cx-btn cx-btn-ghost cx-btn-icon" style={{ flex: 'none' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
```

Los dos comentarios `eslint-disable` cubren un caso real de la Tarea 6: `eslint-plugin-jsx-a11y` marca error en cualquier `<div onClick>` sin rol interactivo ni manejador de teclado — cierto para casi todo el código, pero no para estos dos casos específicos, verificados contra el linter real (`eslint-plugin-jsx-a11y@6.10.2` + `eslint@10.8.0`):
- El backdrop (clic afuera para cerrar) ya tiene un cierre por teclado equivalente (Escape, vía `useDialogFocus`, y el botón de cerrar) — el clic es una conveniencia extra para mouse, no el único camino.
- El `onClick={(e) => e.stopPropagation()}` del `<div>` interior no es una acción del usuario — solo evita que el clic se propague al backdrop y cierre el diálogo por accidente al hacer clic dentro del contenido.

Nota de sintaxis (importante, verificada empíricamente): cuando la regla marca un `<div>` cuya etiqueta de apertura ocupa varias líneas, el error se reporta en la línea de `<div`, **no** en la línea del atributo `onClick` — por eso el comentario va inmediatamente antes de `<div`, no antes de `onClick={...}`. Un comentario mal ubicado (por ejemplo, justo antes de la línea `onClick`) no suprime nada y deja el error intacto.

- [ ] **Step 3: Reescribir `ConfirmDialog.jsx`**

Reemplazar el archivo completo `soporte-ti-istho/client/src/components/common/ConfirmDialog.jsx`:

```jsx
import { useId, useRef } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const VARIANTS = {
  danger: { icon: Trash2, iconBg: 'var(--color-danger-subtle-bg)', iconColor: 'var(--color-danger-subtle-text)', confirmVariant: 'danger' },
  warning: { icon: AlertTriangle, iconBg: 'var(--color-warning-subtle-bg)', iconColor: 'var(--color-warning-subtle-text)', confirmVariant: 'primary' },
  info: { icon: Info, iconBg: 'var(--color-info-subtle-bg)', iconColor: 'var(--color-info-subtle-text)', confirmVariant: 'secondary' },
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useDialogFocus(dialogRef, open, onCancel);

  if (!open) return null;

  const { icon: Icon, iconBg, iconColor, confirmVariant } = VARIANTS[variant] ?? VARIANTS.danger;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- click-to-dismiss is a mouse-only convenience; keyboard users close via Escape or Cancel, both already accessible
    <div className="cx-dialog-backdrop" onClick={onCancel}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- stopPropagation only prevents the click from reaching the backdrop above; it is not a user-facing action needing its own keyboard equivalent */}
      <div
        ref={dialogRef}
        className="cx-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        style={{ width: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon size={22} color={iconColor} />
        </div>
        <h3 id={titleId} style={{ fontSize: 16, margin: '0 0 4px' }}>{title}</h3>
        <p id={messageId} className="text-muted" style={{ fontSize: 13, margin: '0 0 20px' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
```

Nota: se quitó el `useEffect` de Escape hecho a mano (el que llamaba `document.addEventListener('keydown', ...)`) porque `useDialogFocus` ya cubre Escape. Se usa `role="alertdialog"` (no `role="dialog"`) porque este componente siempre exige una respuesta inmediata (confirmar/cancelar) — es la diferencia semántica que ARIA define entre ambos roles.

- [ ] **Step 4: Verificar que compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores.

- [ ] **Step 5: Verificación manual de teclado**

Levantar el dev server (`npm run dev`), autenticado como admin. Probar `Modal` en `/solicitudes` (clic en cualquier fila abre `SolicitudModal`, que usa `Modal`) y `ConfirmDialog` en `/empleados` (botón de desactivar/eliminar un empleado):
- Al abrir, el foco cae dentro del diálogo (no queda en el botón que lo abrió, no queda "perdido" en el `<body>`).
- `Tab` repetido cicla solo entre los controles del diálogo — nunca se escapa hacia la página de atrás.
- `Escape` cierra el diálogo.
- Al cerrar (con Escape, con el botón de cerrar, o cancelando), el foco vuelve exactamente al elemento que abrió el diálogo.

Detener el dev server al terminar.

- [ ] **Step 6: Commit**

```bash
git add soporte-ti-istho/client/src/hooks/useDialogFocus.js soporte-ti-istho/client/src/components/common/Modal.jsx soporte-ti-istho/client/src/components/common/ConfirmDialog.jsx
git commit -m "feat: hook useDialogFocus y semantica ARIA de dialogo en Modal/ConfirmDialog"
```

---

### Task 2: `Select.jsx` — patrón WAI-ARIA listbox completo

**Files:**
- Modify: `soporte-ti-istho/client/src/components/common/Select.jsx` (todo el archivo, 105 líneas)
- Modify: `soporte-ti-istho/client/src/styles/centhrix/components.css:83-85` (agregar una regla)

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: nada consumido por otras tareas.

**Decisión de foco:** este componente sigue el patrón WAI-ARIA "select-only combobox" — el foco del DOM **permanece siempre en el botón trigger**, nunca se mueve al panel de opciones. El panel usa `aria-activedescendant` en el botón para decirle al lector de pantalla cuál opción está resaltada, mientras las flechas se manejan en el propio botón. Esto evita un problema real: el panel se renderiza vía `createPortal` al final de `document.body`, fuera del orden natural del DOM del componente — si el foco se moviera ahí dentro, `Tab` para salir del listbox tendría un comportamiento de "siguiente elemento" ambiguo/impredecible. Manteniendo el foco en el botón (que sí está en su posición natural del árbol), `Tab` simplemente continúa su curso normal hacia lo que sigue después del `Select` en la página — que es justo el requisito del spec.

- [ ] **Step 1: Reescribir `Select.jsx`**

Reemplazar el archivo completo `soporte-ti-istho/client/src/components/common/Select.jsx`:

```jsx
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
      {label && <label className="cx-label" style={{ display: 'block', marginBottom: 4 }}>{label}</label>}

      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        className={`cx-select-trigger${open ? ' open' : ''}`}
        style={{ width: '100%' }}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
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
```

Tres detalles verificados contra el linter real (`eslint-plugin-jsx-a11y@6.10.2`), necesarios para que la Tarea 6 pase sin errores en este archivo:
- `role="combobox"` en el trigger: sin este rol explícito, el rol implícito del elemento es `button`, y `aria-activedescendant` no es una propiedad ARIA válida en un `button` — solo en roles compuestos como `combobox`/`listbox`/`grid`/etc. Es además semánticamente correcto: este es exactamente el patrón WAI-ARIA "select-only combobox".
- `tabIndex={-1}` en cada opción: la regla `jsx-a11y/interactive-supports-focus` exige que un elemento con `role="option"` sea enfocable de alguna forma. Estas opciones nunca reciben foco real de todos modos (el foco se queda en el trigger, como se explicó arriba) — `tabIndex={-1}` las hace "programáticamente enfocables" sin agregarlas al orden de tabulación, que es suficiente para la regla y no cambia el comportamiento real.
- El comentario `eslint-disable-next-line jsx-a11y/click-events-have-key-events` en la opción: esta regla no tiene forma de saber que el manejo de teclado ya ocurre centralizado en el trigger (patrón `aria-activedescendant`) en vez de en cada opción individual — es un falso positivo conocido de esta regla para este patrón específico, no un hueco real de accesibilidad.

- [ ] **Step 2: Agregar el estilo visual de la opción "activa" (resaltada por teclado)**

En `soporte-ti-istho/client/src/styles/centhrix/components.css`, la regla existente en la línea 85 es:

```css
.cx-select-option.selected { color: var(--accent-700); font-weight: 600; }
```

Agregar justo después (misma sección "Custom select"):

```css
.cx-select-option.active { background: var(--accent-100); color: var(--accent-800); }
```

Mismo tratamiento visual que ya tiene `.cx-select-option:hover` (línea 84) — así la opción resaltada por teclado se ve igual que si el mouse estuviera sobre ella.

- [ ] **Step 3: Verificar que compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores.

- [ ] **Step 4: Verificación manual de teclado**

Levantar el dev server. Ir a cualquier página con un `Select` (ej. el filtro de "Estado" en `/solicitudes`):
- `Tab` hasta el trigger, `Enter` o flecha abajo lo abre.
- Flechas arriba/abajo mueven la opción resaltada (visualmente, con el mismo estilo que el hover).
- Escribir una letra salta a la primera opción que empiece con esa letra.
- `Enter` selecciona la opción resaltada y cierra.
- `Escape` cierra sin cambiar el valor.
- `Tab` con el panel abierto lo cierra y el foco continúa hacia el siguiente control de la página (no vuelve al trigger, no se pierde).

Detener el dev server al terminar.

- [ ] **Step 5: Commit**

```bash
git add soporte-ti-istho/client/src/components/common/Select.jsx soporte-ti-istho/client/src/styles/centhrix/components.css
git commit -m "feat: patron WAI-ARIA listbox completo en Select (teclado, aria-activedescendant, typeahead)"
```

---

### Task 3: `DatePicker.jsx` — trigger enfocable y semántica de diálogo

**Files:**
- Modify: `soporte-ti-istho/client/src/components/common/DatePicker.jsx` (todo el archivo, 268 líneas)

**Interfaces:**
- Consumes: `useDialogFocus(dialogRef, open, onClose)` de la Tarea 1 (`soporte-ti-istho/client/src/hooks/useDialogFocus.js`).
- Produces: la estructura de refs `wrapperRef`/`triggerRef`/`popupRef` y las constantes `year`/`month`/`display` que la Tarea 4 modifica en el mismo archivo — la Tarea 4 debe ejecutarse después de esta.

**Por qué el trigger no puede ser un `<button>` que envuelva todo:** el campo hoy tiene, dentro del mismo `<div onClick>`, tanto la acción de "abrir calendario" como un ícono "✕" para limpiar el valor con su propio `onClick` + `stopPropagation`. Si el contenedor entero pasara a ser un `<button>`, el "✕" no podría ser también un `<button>` — HTML no permite anidar elementos interactivos (`<button><button>...` es inválido y el navegador cierra el `<button>` externo antes de tiempo, rompiendo el layout). La solución: el contenedor del campo sigue siendo un `<div>` (solo decorativo, con el borde/fondo), y dentro van **dos** controles hermanos — el botón de abrir calendario (ocupa el espacio del texto) y el botón de limpiar (aparte, a la derecha) — nunca uno dentro del otro.

- [ ] **Step 1: Reescribir `DatePicker.jsx`**

Reemplazar el archivo completo `soporte-ti-istho/client/src/components/common/DatePicker.jsx`:

```jsx
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
```

Cambios clave respecto al original:
- `triggerRef` (antes en el `<div>` exterior) se dividió en dos refs: `wrapperRef` (el `<div>` exterior completo, para la detección de "clic afuera") y `triggerRef` (ahora en el `<button>` de abrir calendario, para calcular la posición del popup) — mismo patrón dual que ya usa `Select.jsx` (`ref`/`btnRef`).
- Se quitaron `focus:outline-none focus:ring-2 focus:ring-orange-500/50` de `fieldCls` (ese `<div>` ya no es el elemento enfocable, así que ese CSS nunca se aplicaba realmente) y se movió un anillo de foco equivalente (`focus-visible:ring-2 focus-visible:ring-orange-500/50`) al `<button>` real.
- El ícono "✕" pasa de `<span onClick>` a `<button type="button" aria-label="Borrar fecha">`, hermano del botón de abrir (no anidado).

- [ ] **Step 2: Verificar que compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores.

- [ ] **Step 3: Verificación manual de teclado (parcial — la navegación por flechas dentro de la grilla llega en la Tarea 4)**

Levantar el dev server. Ir a cualquier página con un `DatePicker` (ej. filtro de fecha en `/solicitudes` si existe, o el formulario de creación de solicitud). Confirmar:
- `Tab` alcanza el campo de fecha (antes no se podía enfocar en absoluto).
- `Enter`/Espacio lo abre.
- `Escape` lo cierra y el foco vuelve al campo.
- Con un valor cargado, el botón "✕" es alcanzable con `Tab` por separado y funciona con `Enter`/clic.
- Los botones de navegación (‹/›) del popup ya tienen anuncio de qué hacen (inspeccionar con las herramientas de accesibilidad del navegador, no hace falta lector de pantalla completo).

Detener el dev server al terminar.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/client/src/components/common/DatePicker.jsx
git commit -m "feat: trigger enfocable y semantica de dialogo (role, useDialogFocus) en DatePicker"
```

---

### Task 4: `DatePicker.jsx` — navegación por teclado en las grillas de día/mes/año

**Files:**
- Modify: `soporte-ti-istho/client/src/components/common/DatePicker.jsx` (mismo archivo de la Tarea 3, después de sus cambios)

**Interfaces:**
- Consumes: la estructura de la Tarea 3 — específicamente `display`/`setDisplay`, `view`/`setView`, `year`/`month` (derivados de `display`), `selectDay`, `open`, y el `useDialogFocus(popupRef, ...)` ya presente (el nuevo efecto de esta tarea debe ir **después** de esa llamada en el cuerpo del componente — ver Step 2).
- Produces: nada consumido por otras tareas.

**Por qué el nuevo efecto de foco debe ir después de `useDialogFocus`:** React ejecuta los efectos de un componente en el orden en que se llaman durante el render. `useDialogFocus` ya mueve el foco al primer elemento enfocable del popup apenas se abre (probablemente el botón "‹" de mes anterior). El nuevo efecto de esta tarea vuelve a mover el foco, esta vez a la celda de día/mes/año que corresponde. Si el nuevo efecto se declara *después* de la llamada a `useDialogFocus` en el código, React lo ejecuta después, y su `.focus()` es el que "gana" — quedando el foco en la celda correcta en vez de en el botón "‹". Si se declarara antes, sería al revés y el foco quedaría mal ubicado.

- [ ] **Step 1: Agregar estado y refs de celda activa**

En `DatePicker.jsx`, en la lista de hooks al inicio del componente (justo después de `const popupId = useId();`), agregar:

```js
  const [activeDate, setActiveDate] = useState(() => parseValue(value) || new Date());
  const [prevOpenForActiveDate, setPrevOpenForActiveDate] = useState(open);
  const activeCellRef = useRef(null);
```

`prevOpenForActiveDate` se explica en el Step 3 — es lo que permite sincronizar `activeDate` al abrir sin usar un `useEffect` (que, verificado contra el linter real del proyecto, dispara un error — ver más abajo).

- [ ] **Step 2: Enfocar la celda activa cada vez que cambia**

Justo después de la línea `useDialogFocus(popupRef, open, () => { setOpen(false); setView('day'); });` (que ya existe de la Tarea 3), agregar:

```js
  useEffect(() => {
    if (open) activeCellRef.current?.focus();
  }, [open, view, activeDate]);
```

Este efecto solo mueve el foco (una llamada a `.focus()` del DOM, no un `setState` de React) — depende de `[open, view, activeDate]` porque debe re-enfocar la celda correcta cada vez que el usuario cambia de vista o mueve la selección con flechas.

- [ ] **Step 3: Sincronizar `activeDate` al abrir — sin `useEffect`**

Sería natural escribir esto como un tercer `useEffect` (`useEffect(() => { if (open) setActiveDate(selected || new Date()); }, [open]);`), pero **no hacerlo así**: verificado contra el linter real de este proyecto (`eslint-plugin-react-hooks@7.1.1`, ya instalado, su regla `react-hooks/set-state-in-effect` ya forma parte de `reactHooks.configs.flat.recommended` en `eslint.config.js` desde antes de este plan), llamar a un `setState` de forma síncrona dentro de un `useEffect` es un **error** de lint, no una advertencia. La solución que React mismo recomienda para "ajustar un estado cuando cambia otra cosa" sin usar un efecto es actualizar el estado **directamente durante el render**, comparando contra el valor anterior guardado en otro estado — ver <https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes>.

En `DatePicker.jsx`, la línea `const selected = parseValue(value);` ya existe (de la Tarea 3), seguida de `const today = new Date();`. Reemplazar:

```js
  const selected = parseValue(value);
  const today = new Date();
```

por:

```js
  const selected = parseValue(value);

  if (open !== prevOpenForActiveDate) {
    setPrevOpenForActiveDate(open);
    if (open) setActiveDate(selected || new Date());
  }

  const today = new Date();
```

Llamar a `setActiveDate`/`setPrevOpenForActiveDate` aquí, directamente en el cuerpo del componente (no dentro de un efecto ni de un manejador de eventos), es un patrón explícitamente soportado por React: si el valor cambia, React descarta el render en curso y vuelve a renderizar inmediatamente con el estado actualizado, antes de pintar nada en pantalla — no dispara un efecto post-commit ni un re-render "en cascada" visible, que es justo lo que la regla de lint objeta de la versión con `useEffect`. Esto solo puede ir **después** de `const selected = parseValue(value);` (a diferencia del Step 2, que no depende de `selected` y por eso sí puede ir arriba, junto a `useDialogFocus`).

- [ ] **Step 4: Agregar las funciones de movimiento y los manejadores de teclado**

Agregar estas funciones dentro del componente, después de la declaración de `selectDay` (que ya existe de la Tarea 3):

```js
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
```

`moveActiveMonthCell`/`moveActiveYearCell` envuelven (wraparound) dentro de la misma grilla de 12 celdas visible (mismo año para meses, mismo bloque de 12 años para años) — no cruzan a la grilla adyacente, tal como especifica el diseño. `moveActiveDay`/`moveActiveMonthInYear` sí cruzan de mes/año libremente, manteniendo `display` sincronizado para que la grilla visible siga a la celda activa.

- [ ] **Step 5: Conectar `tabIndex`/`ref`/`onKeyDown` en la grilla de días**

Reemplazar el bloque de renderizado de la celda de día (dentro de `{view === 'day' && (...)}`, la función que retorna el `<button>` de cada día):

```jsx
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
```

por:

```jsx
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
```

- [ ] **Step 6: Conectar `tabIndex`/`ref`/`onKeyDown` en la grilla de meses**

Reemplazar el bloque `{view === 'month' && (...)}`:

```jsx
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
```

por:

```jsx
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
```

- [ ] **Step 7: Conectar `tabIndex`/`ref`/`onKeyDown` en la grilla de años**

Reemplazar el bloque `{view === 'year' && (...)}`:

```jsx
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
```

por:

```jsx
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
```

- [ ] **Step 8: Verificar que compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores.

- [ ] **Step 9: Verificación manual de teclado**

Levantar el dev server. Abrir un `DatePicker` con `Tab`+`Enter`. Confirmar, en la vista de día:
- El foco cae en un solo día (el seleccionado, o hoy si no hay valor) — no en el botón "‹".
- `←`/`→` mueven un día; `↑`/`↓` mueven una semana; cruzar el fin de mes cambia la grilla visible al mes siguiente/anterior automáticamente.
- `Home`/`End` van al primer/último día de la fila donde está la celda activa.
- `PageUp`/`PageDown` cambian de mes manteniendo el mismo día (o el último día del mes si no existe, ej. 31 de enero → 28/29 de febrero); `Shift+PageUp`/`Shift+PageDown` cambian de año.
- `Enter` selecciona el día activo y cierra.

Clic en el encabezado (mes/año) para ir a la vista de mes, luego a la de año — confirmar que las flechas mueven la celda activa dentro de esa grilla de 12, con wraparound al llegar al borde (sin cruzar a otro año/década).

Detener el dev server al terminar.

- [ ] **Step 10: Commit**

```bash
git add soporte-ti-istho/client/src/components/common/DatePicker.jsx
git commit -m "feat: navegacion por teclado (roving tabindex) en grillas de dia/mes/anio de DatePicker"
```

---

### Task 5: `Pagination.jsx` — `aria-label` en botones de ícono

**Files:**
- Modify: `soporte-ti-istho/client/src/components/common/Pagination.jsx:8,12`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: nada consumido por otras tareas.

- [ ] **Step 1: Agregar los `aria-label`**

Reemplazar en `Pagination.jsx`:

```jsx
export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '16px 0' }}>
      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft size={14} />
      </button>
      <span className="text-muted" style={{ fontSize: 12 }}>Página {page} de {totalPages}</span>
      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
```

por:

```jsx
export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '16px 0' }}>
      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior">
        <ChevronLeft size={14} />
      </button>
      <span className="text-muted" style={{ fontSize: 12 }}>Página {page} de {totalPages}</span>
      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Página siguiente">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores.

- [ ] **Step 3: Commit**

```bash
git add soporte-ti-istho/client/src/components/common/Pagination.jsx
git commit -m "fix: aria-label en botones de paginacion"
```

---

### Task 6: `eslint-plugin-jsx-a11y` — instalación y severidad dividida por archivo

**Files:**
- Modify: `soporte-ti-istho/client/package.json` (nueva devDependency)
- Modify: `soporte-ti-istho/client/eslint.config.js` (todo el archivo, 21 líneas)

**Interfaces:**
- Consumes: los 5 archivos ya corregidos en las Tareas 1-5 (esta tarea corre al final porque verifica su resultado con `error` estricto).
- Produces: nada consumido por otras tareas (es la última).

- [ ] **Step 1: Instalar el paquete**

Run (desde `soporte-ti-istho/client/`):

```bash
npm install -D eslint-plugin-jsx-a11y@6.10.2 --legacy-peer-deps
```

Expected: instala sin error (con `--legacy-peer-deps` se ignora el conflicto de peer-dependency con `eslint@^10` — ya verificado que el paquete funciona igual). Confirmar que `soporte-ti-istho/client/package.json` ahora lista `"eslint-plugin-jsx-a11y": "6.10.2"` en `devDependencies`.

- [ ] **Step 2: Reescribir `eslint.config.js` con severidad dividida**

Reemplazar el archivo completo `soporte-ti-istho/client/eslint.config.js`:

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

const A11Y_STRICT_FILES = [
  'src/components/common/Modal.jsx',
  'src/components/common/ConfirmDialog.jsx',
  'src/components/common/Select.jsx',
  'src/components/common/DatePicker.jsx',
  'src/components/common/Pagination.jsx',
]

const a11yRuleNames = Object.keys(jsxA11y.flatConfigs.recommended.rules)
const a11yWarnRules = Object.fromEntries(a11yRuleNames.map((rule) => [rule, 'warn']))
const a11yErrorRules = Object.fromEntries(a11yRuleNames.map((rule) => [rule, 'error']))

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: a11yWarnRules,
  },
  {
    files: A11Y_STRICT_FILES,
    rules: a11yErrorRules,
  },
])
```

`files: ['**/*.{js,jsx}']` ya trae `jsx-a11y/recommended` a nivel `error`/`off` por defecto (según cada regla), y el bloque `rules: a11yWarnRules` que sigue lo baja todo a `warn` para el resto de la app. El segundo bloque de configuración, que solo aplica a `A11Y_STRICT_FILES`, sube esas mismas 34 reglas de vuelta a `error` — pero solo para esos 5 archivos. ESLint (flat config) aplica los bloques en orden y el último que matchea un archivo dado gana para cada regla, así que esto produce exactamente: `error` en los 5 archivos corregidos, `warn` en todo lo demás.

Nota: `A11Y_STRICT_FILES` usa rutas relativas a `soporte-ti-istho/client/` (donde vive `eslint.config.js` y desde donde corre `npm run lint`, que ejecuta `eslint .`) — no rutas relativas al repo completo.

- [ ] **Step 3: Verificar los 5 archivos corregidos, y que ninguna regla `jsx-a11y/*` aparezca en el resto**

**Importante — leer antes de correr nada:** `npm run lint` en este proyecto **ya termina con errores hoy, en `main`, sin ningún cambio de este plan** (23 errores + 2 warnings preexistentes, verificado empíricamente antes de escribir este plan — ver Global Constraints). Ese comando **nunca** va a salir "limpio" completo, ni antes ni después de esta tarea, y no es la señal correcta para esta verificación. Los pasos siguientes SÍ son correctos y alcanzables:

Run: `cd soporte-ti-istho/client && npx eslint src/components/common/Modal.jsx src/components/common/ConfirmDialog.jsx src/components/common/Select.jsx src/components/common/DatePicker.jsx src/components/common/Pagination.jsx`
Expected: **cero** problemas (ni error ni warning) — estos 5 archivos, y solo estos 5, deben quedar completamente limpios. Si aparece algo, leer qué regla lo señala y corregir el código — no silenciar con `eslint-disable` salvo que, tras investigar, la regla resulte genuinamente inaplicable (y en tal caso, dejar un comentario explicando por qué, siguiendo el mismo patrón ya usado en `Modal.jsx`/`ConfirmDialog.jsx`/`Select.jsx` en las Tareas 1 y 2).

Run: `cd soporte-ti-istho/client && npm run lint 2>&1 | grep "jsx-a11y/"`
Expected: **sin salida** (ningún match) — confirma que ninguna regla de `jsx-a11y` aparece en errores NI en warnings en ningún archivo de todo el proyecto (ni siquiera los 20+ archivos fuera de este plan, que quedan en `warn` por diseño pero aun así no deberían disparar nada porque `jsx-a11y/recommended` solo señala problemas reales, y esos archivos — aunque tengan `<div onClick>` sin rol — aún no fueron auditados uno por uno; si este grep encuentra algo, es información nueva y real sobre el estado de la app, repórtala, no la ignores, pero no la arregles en esta tarea).

Run (opcional, para contexto): `cd soporte-ti-istho/client && npm run lint 2>&1 | tail -5`
Esto muestra el conteo total de problemas — debería ser el mismo baseline de 23 errores / 2 warnings de antes de este plan (más los nuevos `warning`s de `jsx-a11y` en archivos fuera de alcance, que si existen deben reportarse per el punto anterior). Si el conteo de **errores** subió respecto al baseline, algo de este plan rompió algo — investigar antes de continuar.

- [ ] **Step 4: Verificar que el build sigue pasando**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores (instalar una devDependency de lint no debería afectar el build de producción, pero se confirma de todas formas).

- [ ] **Step 5: Commit**

```bash
git add soporte-ti-istho/client/package.json soporte-ti-istho/client/package-lock.json soporte-ti-istho/client/eslint.config.js
git commit -m "chore: agregar eslint-plugin-jsx-a11y con severidad error en componentes corregidos, warn en el resto"
```

---

## Verificación final recomendada

No hay herramienta de automatización de navegador en este entorno, así que ninguna de las verificaciones de teclado de las tareas anteriores es 100% automatizable. Antes de dar el trabajo por cerrado, se recomienda una pasada manual real (sin mouse) cubriendo los 5 componentes en al menos una pantalla real de la app donde cada uno aparece — no solo releer el JSX.
