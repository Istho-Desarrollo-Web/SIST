# Centhrix: Accesibilidad de componentes compartidos de alto impacto — Design

## Contexto y motivación

Al revisar la Tarea 1 del polish de Dashboard (`docs/superpowers/specs/2026-08-04-centhrix-dashboard-polish-design.md`), el revisor final marcó que las nuevas tarjetas KPI clicables y filas de actividad no tienen soporte de teclado ni lector de pantalla, y que ese patrón (`<div onClick>` sin `role`/`tabIndex`/`onKeyDown`) ya existía antes en el mismo archivo. Una investigación posterior confirmó que el problema es sistémico: el commit `034a506` ("rediseño visual Centhrix") reescribió casi todos los componentes compartidos y páginas sin agregar semántica de accesibilidad, y no hay ninguna herramienta de lint que lo hubiera detectado (`eslint-plugin-jsx-a11y` no está instalado).

Esta es una mejora de **calidad interna**, no una respuesta a una exigencia externa (auditoría, cliente, normativa) ni a un caso puntual reportado por un usuario. Por eso el alcance se elige por apalancamiento: arreglar los componentes que se usan en toda la app en vez de recorrer página por página.

## Alcance

Este spec cubre los **5 componentes compartidos de mayor impacto**, elegidos porque una sola corrección en cada uno se propaga a todos sus puntos de uso:

1. `client/src/components/common/Modal.jsx` — usado en 8 flujos (EmpleadosPage, UsuariosPage, SolicitudModal, SolicitudForm, ImportarEmpleadosModal, RespuestaDetalleModal, CampoEditorModal, PDFSuccessModal).
2. `client/src/components/common/ConfirmDialog.jsx` — usado en EmpleadosPage, UsuariosPage, SeccionItem, FormularioPDFsPage.
3. `client/src/components/common/Select.jsx` — mandatado por `CLAUDE.md` como el único dropdown permitido en todo el proyecto.
4. `client/src/components/common/DatePicker.jsx` — mandatado por `CLAUDE.md` como el único selector de fecha permitido.
5. `client/src/components/common/Pagination.jsx` — usado en toda tabla paginada de la app.

Más una pieza de infraestructura nueva (el hook compartido de foco) y una de tooling (`eslint-plugin-jsx-a11y`).

**Explícitamente fuera de alcance** (documentado para sub-proyectos futuros):
- El patrón `<div onClick>` a nivel de página: tarjetas KPI y fila de actividad en `DashboardPage.jsx`, fila de tabla en `SolicitudesPage.jsx`, swatch de color en `PDFMapper.jsx`. Se agrega `eslint-plugin-jsx-a11y` en modo `warn` para estos archivos como recordatorio, pero no se corrigen en este spec.
- Botones de solo-ícono sin `aria-label` fuera de los 5 archivos de este spec (Empleados, Usuarios, Solicitudes, Dashboard, `FormulariosHomePage`, `ArchivoViewer`, `ImportarEmpleadosModal`) — mismo tratamiento: `warn`, no fix.
- Alternativa de teclado para el drag-and-drop de campos en `PDFMapper.jsx` (reposicionar cajas sobre el PDF) — gap real pero de mecánica muy distinta (arrastre visual vs. formularios/diálogos), amerita su propio spec.
- Auditoría de contraste de color — no se puede hacer leyendo código estático; necesitaría medir colores ya renderizados. Nota positiva: los badges de estado/prioridad y el indicador de SLA ya combinan color con texto, no dependen solo del color.
- Migración visual de `DatePicker.jsx` de Tailwind heredado (`bg-white dark:bg-navy-800`, etc.) a clases `cx-*` — ya se había dejado fuera de alcance en la sesión anterior (spec de Formularios/Reportes/DatePicker pendiente); este spec solo toca comportamiento y ARIA, no el CSS visual.

## 1. Hook compartido: `useDialogFocus`

Nuevo archivo: `client/src/hooks/useDialogFocus.js` (primer archivo en `src/hooks/`, hoy vacío).

**API:** `useDialogFocus(dialogRef, open, onClose)` — un hook que, mientras `open` es `true`:
- Guarda `document.activeElement` al momento de abrir.
- Mueve el foco al primer elemento enfocable dentro de `dialogRef.current` (o al propio contenedor con `tabIndex={-1}` si no hay ninguno).
- Escucha `keydown` para:
  - `Tab` / `Shift+Tab`: cicla el foco solo entre los elementos enfocables del diálogo (si `Tab` está en el último, vuelve al primero; si `Shift+Tab` está en el primero, va al último) — nunca deja que el foco salga del diálogo mientras está abierto.
  - `Escape`: invoca `onClose()`.
- Al cerrar (`open` pasa a `false`) o desmontar: restaura el foco al elemento guardado al abrir.

Se usa igual en `Modal.jsx` y `ConfirmDialog.jsx` — son los únicos 2 consumidores. No se generaliza en hooks más pequeños (`useFocusTrap`, `useEscapeKey`, `useFocusRestore` por separado) porque con 2 consumidores idénticos esa separación es abstracción prematura; tampoco se usa una librería externa (`focus-trap-react` u otra) porque el proyecto no tiene ninguna dependencia de comportamiento de UI — todo está hecho a mano (`Select`, `DatePicker`, `Modal` mismos) y esto es ~40 líneas.

## 2. `Modal.jsx` y `ConfirmDialog.jsx`

**`Modal.jsx`:**
- El contenedor `.cx-dialog` gana `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apuntando a un `id` generado para el `<h3>` del título (usar `useId()` de React para el id, evita colisiones si hay más de un Modal en el árbol alguna vez).
- Se agrega `useDialogFocus(dialogRef, open, onClose)` — Modal gana Escape-to-close (hoy no lo tiene), trap de foco, foco inicial y restauración (ninguno de los dos existe hoy).
- El botón de cerrar (ícono `X`, línea 24) gana `aria-label="Cerrar"`.

**`ConfirmDialog.jsx`:**
- El contenedor `.cx-dialog` gana `role="alertdialog"` (no `dialog` — un diálogo de confirmación exige respuesta inmediata, que es justo lo que `alertdialog` señala), `aria-modal="true"`, `aria-labelledby` al `<h3>` del título, `aria-describedby` al `<p>` del mensaje (ambos con `id` vía `useId()`).
- Se reemplaza el `useEffect` de Escape hecho a mano (líneas 21-26) por `useDialogFocus`, quedando consistente con `Modal.jsx` — hoy están inconsistentes (uno tiene Escape, el otro no) y ninguno de los dos tiene trap de foco ni restauración.

Ningún cambio visual: el CSS de `.cx-dialog`/`.cx-dialog-backdrop` no se toca.

## 3. `Select.jsx` — patrón WAI-ARIA listbox completo

Hoy el trigger es un `<button>` real (correcto), pero el panel de opciones (líneas 67-83) son `<div onClick>` sin rol — se puede abrir con teclado pero no navegar ni seleccionar sin mouse.

**Trigger** (líneas 89-100): gana `aria-haspopup="listbox"` y `aria-expanded={open}`. Al abrirse por teclado (Enter, Espacio, o flecha abajo), el foco lógico pasa al listbox con la opción activa inicializada en la seleccionada actual (o la primera opción si no hay valor).

**Nuevo estado:** `const [activeIndex, setActiveIndex] = useState(-1);` — índice de la opción "activa" (resaltada, distinta de "seleccionada"). Se resetea a la posición del valor seleccionado cada vez que se abre.

**Panel** (línea 68): gana `role="listbox"`, `id` propio (vía `useId()`), y `aria-activedescendant` apuntando al `id` de la opción activa — el foco del DOM permanece en el listbox (o en el trigger, según implementación) mientras `aria-activedescendant` le dice al lector de pantalla cuál opción está resaltada. Este es el patrón estándar para listbox (no roving tabindex real, que es el patrón de un grid como el de `DatePicker`).

**Cada opción** (líneas 72-79): gana `role="option"`, `id` único, `aria-selected={isActive}`.

**Teclado, mientras el panel está abierto:**
- `↓` / `↑`: mueve `activeIndex` (con wraparound: de la última vuelve a la primera y viceversa).
- `Home` / `End`: salta a la primera/última opción.
- `Enter`: selecciona la opción en `activeIndex` (`onChange(opt.value)`) y cierra.
- `Escape`: cierra sin cambiar `value`, devuelve el foco al trigger.
- `Tab`: cierra el panel sin seleccionar y deja que el foco siga su curso normal (un listbox no debe atrapar Tab como sí hace un diálogo modal).
- **Typeahead:** escribir un carácter mueve `activeIndex` a la primera opción cuyo `label` empiece con ese carácter (case-insensitive); pulsaciones consecutivas en una ventana de 500ms se acumulan como una búsqueda de texto más larga (mismo patrón de debounce por `setTimeout` que ya usa `SolicitudesPage.jsx` para el buscador — no introduce un estilo nuevo en el código).

La estructura visual (`cx-select-trigger`, `cx-select-panel`, `cx-select-option`) no cambia — esto es una reescritura de la lógica de apertura/navegación/selección, no del CSS.

## 3. `DatePicker.jsx` — la pieza más grande

Hoy el trigger es un `<div onClick>` (línea 244) — el único de los 4 casos que ni siquiera se puede abrir con teclado. Una vez abierto, los botones de navegación/día/mes/año ya son `<button>` reales (alcanzables con Tab), pero sin navegación por flechas.

**Trigger** (líneas 244-262): pasa de `<div onClick>` a `<button type="button">`, mismo patrón que el trigger de `Select.jsx`. Gana `aria-haspopup="dialog"` y `aria-expanded={open}`. El ícono "✕" de limpiar valor (línea 253, hoy `<span onClick>`) pasa a `<button type="button" aria-label="Borrar fecha">`, con `e.stopPropagation()` conservado para no reabrir el popup.

**Popup** (línea 114): el contenedor gana `role="dialog"`, `aria-modal="true"`, `aria-label="Seleccionar fecha"`, y usa `useDialogFocus(popupRef, open, () => { setOpen(false); setView('day'); })` — mismo hook de la sección 1. Esto le da Escape-to-close (hoy no existe) y trap de foco + restauración (tampoco existen).

**Grilla de días** (vista `day`, líneas 143-174): roving tabindex real — solo la celda considerada "activa" tiene `tabIndex={0}`, el resto `tabIndex={-1}`; mover el foco con flechas llama `.focus()` explícitamente en la nueva celda (necesario porque son elementos distintos en cada render, a diferencia de `aria-activedescendant` que usa `Select`).
- `←` / `→`: día anterior/siguiente; si cruza el límite del mes visible, cambia `display` al mes adyacente y la celda activa pasa a ese mes.
- `↑` / `↓`: retrocede/avanza 7 días (una semana), con el mismo cruce de mes si aplica.
- `Home` / `End`: primer/último día de la fila (semana) donde está la celda activa.
- `PageUp` / `PageDown`: mes anterior/siguiente, intentando mantener el mismo número de día (si el mes destino tiene menos días, cae al último día de ese mes).
- `Shift+PageUp` / `Shift+PageDown`: año anterior/siguiente, misma lógica de día.
- `Enter` / `Espacio`: selecciona el día activo (`selectDay`) y cierra.

**Vistas de mes/año** (grillas de 3 columnas, líneas 177-210): mismo patrón de roving tabindex. `←`/`→` mueven 1 celda, `↑`/`↓` mueven 3 (una fila completa), con wraparound al borde del grid de 12 celdas. `Enter` selecciona y avanza a la vista siguiente (mes → día, año → mes), igual que ya hace el click hoy.

**Header de navegación** (líneas 121-140, ya son `<button>`): las flechas `‹`/`›` ganan `aria-label="Mes/año anterior"` / `aria-label="Mes/año siguiente"` (el texto exacto depende de `view`, igual que ya varía `headerLabel`).

No se toca el CSS Tailwind heredado de este archivo (`bg-white dark:bg-navy-800`, `border-slate-300`, etc.) — sigue fuera de alcance de este spec, ya definido en la sesión anterior.

Esta es, con diferencia, la pieza más grande del spec: es la única que toca lógica real de fechas (cruces de mes/año durante la navegación por teclado), no solo atributos ARIA y manejo de foco como las demás.

## 4. `Pagination.jsx`

Los dos botones de ícono (`ChevronLeft`/`ChevronRight`, líneas 8 y 12) ganan `aria-label="Página anterior"` y `aria-label="Página siguiente"` respectivamente. Ya son `<button>` reales con `disabled` correcto — cambio mínimo, sin riesgo, sin lógica nueva.

## 5. Tooling: `eslint-plugin-jsx-a11y`

- Se agrega como devDependency (`npm install -D eslint-plugin-jsx-a11y` dentro de `client/`).
- En `eslint.config.js` se agrega un bloque adicional (junto al existente `files: ['**/*.{js,jsx}']`) que aplica `jsxA11y.flatConfigs.recommended` con severidad `error` **solo** a los 5 archivos de este spec (glob explícito: `client/src/components/common/{Modal,ConfirmDialog,Select,DatePicker,Pagination}.jsx`) y con severidad `warn` al resto de `**/*.{js,jsx}` (recordatorio no bloqueante sobre las violaciones ya identificadas y explícitamente diferidas: divs-clicables de página, botones de ícono sin `aria-label` en páginas, etc.).
- Justificación de la severidad dividida: los 5 archivos de este spec deben quedar realmente limpios (no solo con advertencias silenciables), pero forzar `error` en toda la app rompería `npm run lint` hoy mismo sobre código que se dejó deliberadamente fuera de alcance — eso pasaría el costo de este spec a trabajo no planeado.
- Verificación: `npm run lint` debe terminar sin errores (los `warn` en archivos fuera de alcance son aceptables y esperados).

## Testing

No hay framework de test automatizado en `client/` (confirmado en el spec anterior — solo ESLint, sin Jest/Vitest). La verificación de cada pieza es:
- `npm run build` — compila sin errores.
- `npm run lint` — sin errores (warnings en archivos fuera de alcance son aceptables).
- Inspección manual del código resultante contra los requisitos ARIA/teclado de cada sección.
- Una pasada manual real, exclusivamente con teclado (sin mouse) y opcionalmente con un lector de pantalla, cubriendo: abrir/cerrar cada uno de los 5 componentes, navegar sus opciones/días/páginas, y confirmar que el foco nunca "se escapa" ni se pierde. No hay herramienta de automatización de navegador en este entorno, así que esta pasada la debe hacer una persona antes de dar el trabajo por cerrado — se documentará como recomendación explícita en el plan, igual que en el spec de Dashboard.

## Fuera de alcance (recordatorio)

Ver la sección "Alcance" — el patrón de `<div onClick>` a nivel de página (Dashboard, Solicitudes, PDFMapper), los botones de ícono sin `aria-label` en páginas, la alternativa de teclado para el drag-and-drop de `PDFMapper.jsx`, la auditoría de contraste de color, y la migración visual de `DatePicker.jsx` a clases `cx-*` quedan para sub-proyectos separados. `eslint-plugin-jsx-a11y` en modo `warn` sobre el resto de la app deja un rastro visible de ese trabajo pendiente.
