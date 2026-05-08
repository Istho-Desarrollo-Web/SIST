# 9 Mejoras SIST — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar 9 mejoras al sistema SIST: overflow responsivo, paginación de actividad, notificaciones mejoradas, skeleton correcto, hora en fechas, nuevas secciones de reportes y hardening de animaciones/robustez.

**Architecture:** Cambios aislados en archivos existentes; sin nuevas migraciones. Backend: dos controllers modificados (`dashboardController`, `reportesController`). Frontend: 7 archivos de página/componente modificados + 2 componentes comunes mejorados.

**Tech Stack:** React 19 + Tailwind v4 + Recharts + react-hook-form | Node.js + Express + Sequelize + MySQL | ExcelJS

---

## Mapa de archivos

| Archivo | Cambio |
|---------|--------|
| `soporte-ti-istho/client/src/components/common/Select.jsx` | Fix dropdown `min-w-max` → `w-full` (ítem 1) |
| `soporte-ti-istho/client/src/components/common/DatePicker.jsx` | Fix calendar `w-72` → responsive (ítems 1, 6) |
| `soporte-ti-istho/client/src/components/common/Skeleton.jsx` | Agregar `SkeletonCard` (ítem 5) |
| `soporte-ti-istho/client/src/components/common/Modal.jsx` | Agregar entrada animada (ítem 9) |
| `soporte-ti-istho/client/src/components/layout/Navbar.jsx` | Notificaciones Opción C + mobile clip fix (ítem 4) |
| `soporte-ti-istho/client/src/components/solicitudes/SolicitudModal.jsx` | Mostrar fechaResolucion con hora (ítem 7) |
| `soporte-ti-istho/client/src/pages/SolicitudesPage.jsx` | Usar SkeletonCard en mobile loading (ítem 5) |
| `soporte-ti-istho/client/src/pages/DashboardPage.jsx` | Paginación actividad reciente (ítem 3) |
| `soporte-ti-istho/client/src/pages/ReportesPage.jsx` | Donut tipos + tabla top empleados (ítems 8A, 8B) |
| `soporte-ti-istho/client/src/pages/UsuariosPage.jsx` | Reemplazar `<select>` nativo por `<Select>` (CLAUDE.md rule) |
| `soporte-ti-istho/client/src/services/dashboardService.js` | Pasar params a `actividadReciente` (ítem 3) |
| `soporte-ti-istho/server/src/controllers/dashboardController.js` | Pagination en `actividadReciente` (ítem 3) |
| `soporte-ti-istho/server/src/controllers/reportesController.js` | `topEmpleados` query + Excel con hora (ítems 7, 8B) |
| `soporte-ti-istho/CLAUDE.md` | Documentar error de extensión de navegador (ítem 2) |

---

## Task 1: Fix overflow horizontal — Select y DatePicker (ítem 1 + ítem 6)

**Files:**
- Modify: `soporte-ti-istho/client/src/components/common/Select.jsx:41`
- Modify: `soporte-ti-istho/client/src/components/common/DatePicker.jsx:114`

El dropdown de `Select` usa `min-w-max` que fuerza el ancho al contenido y desborda en móvil. El calendario de `DatePicker` usa `w-72` fijo (288px) que puede sobresalir del viewport.

- [ ] **Step 1: Corregir Select dropdown**

En `Select.jsx` línea 41, cambiar:
```jsx
// Antes
<div className="absolute top-full mt-1 z-50 w-full min-w-max bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 overflow-hidden">

// Después
<div className="absolute top-full mt-1 z-50 w-full bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 overflow-hidden">
```

- [ ] **Step 2: Corregir DatePicker calendar**

En `DatePicker.jsx` línea 114, cambiar:
```jsx
// Antes
<div className="absolute top-full mt-1 z-50 w-72 bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 overflow-hidden">

// Después
<div className="absolute top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 overflow-hidden">
```

- [ ] **Step 3: Verificar en navegador**

Abrir http://localhost:5173/reportes en viewport 375px (DevTools). Abrir el DatePicker "Desde". El calendario no debe sobresalir del borde derecho de la pantalla. Abrir cualquier Select con opciones largas y confirmar que no genera scroll horizontal.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/client/src/components/common/Select.jsx soporte-ti-istho/client/src/components/common/DatePicker.jsx
git commit -m "fix: corregir overflow horizontal en Select y DatePicker en móvil"
```

---

## Task 2: Documentar error de consola de extensión (ítem 2)

**Files:**
- Modify: `soporte-ti-istho/CLAUDE.md`

- [ ] **Step 1: Agregar nota en CLAUDE.md**

Agregar al final de la sección "## Architecture" (o al final del archivo):

```markdown
## Ruido conocido en consola

El error `InvalidNodeTypeError: Failed to execute 'selectNode' on 'Range': the given Node has no parent` y `Unchecked runtime.lastError` son generados por **extensiones del navegador** (ej. Grammarly, LastPass). No son bugs de la aplicación y no requieren acción.
```

- [ ] **Step 2: Commit**

```bash
git add soporte-ti-istho/CLAUDE.md
git commit -m "docs: documentar error de extensión de navegador como ruido conocido"
```

---

## Task 3: Corregir native `<select>` en UsuariosPage (regla CLAUDE.md)

**Files:**
- Modify: `soporte-ti-istho/client/src/pages/UsuariosPage.jsx`

El `UsuarioForm` dentro de `UsuariosPage.jsx` (líneas ~67-75) usa un `<select>` nativo para el campo "Rol". Esto viola la regla de CLAUDE.md. Como `UsuarioForm` usa `react-hook-form`, se requiere `Controller`.

- [ ] **Step 1: Agregar import de Controller y Select**

En `UsuariosPage.jsx`, la primera línea importa `useForm`. Agregar `Controller` a ese import y el componente `Select`:

```jsx
// Cambiar la línea de react-hook-form:
import { useForm, Controller } from 'react-hook-form';

// Agregar import de Select (después de los imports existentes de common):
import { Select } from '../components/common/Select';
```

- [ ] **Step 2: Reemplazar el bloque del select nativo**

Localizar el bloque (líneas ~67-75):
```jsx
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rol</label>
  <select
    {...register('rol')}
    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
  >
    {Object.entries(ROLES_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
</div>
```

Reemplazar por:
```jsx
<Controller
  name="rol"
  control={control}
  render={({ field }) => (
    <Select
      label="Rol"
      value={field.value}
      onChange={field.onChange}
      options={Object.entries(ROLES_LABEL).map(([v, l]) => ({ value: v, label: l }))}
    />
  )}
/>
```

- [ ] **Step 3: Agregar `control` al destructuring del useForm**

En la línea que hace `useForm(...)`:
```jsx
// Antes
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({...});

// Después
const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({...});
```

- [ ] **Step 4: Verificar en navegador**

Ir a http://localhost:5173/usuarios (sesión admin). Crear un nuevo usuario. El campo "Rol" debe mostrarse como el dropdown personalizado, no el nativo. Guardar y confirmar que funciona.

- [ ] **Step 5: Commit**

```bash
git add soporte-ti-istho/client/src/pages/UsuariosPage.jsx
git commit -m "fix: reemplazar select nativo por componente Select en UsuarioForm"
```

---

## Task 4: Backend — paginación en actividadReciente (ítem 3)

**Files:**
- Modify: `soporte-ti-istho/server/src/controllers/dashboardController.js:106-142`

- [ ] **Step 1: Actualizar función actividadReciente**

Reemplazar la función completa `actividadReciente` (líneas 106-142):

```js
async function actividadReciente(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const { count, rows: registros } = await Auditoria.findAndCountAll({
      where: { tabla: 'solicitudes' },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'], required: false }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const ids = [...new Set(registros.map(r => r.registro_id))];
    const solicitudes = ids.length > 0
      ? await Solicitud.findAll({
          where: { id: { [Op.in]: ids } },
          attributes: ['id', 'numero'],
          include: [{ model: Empleado, as: 'empleado', attributes: ['nombreCompleto'] }],
        })
      : [];
    const solMap = Object.fromEntries(solicitudes.map(s => [s.id, s]));

    const data = registros.map(r => {
      const sol = solMap[r.registro_id];
      return {
        id: r.id,
        operacion: r.operacion,
        campo: r.campo_modificado,
        estadoNuevo: r.datos_nuevos?.estado || null,
        estadoAnterior: r.datos_anteriores?.estado || null,
        usuario: r.usuario?.nombre || 'Sistema',
        solicitudNumero: sol?.numero || `#${r.registro_id}`,
        empleado: sol?.empleado?.nombreCompleto || null,
        fecha: r.createdAt,
      };
    });

    res.json({
      success: true,
      data,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { next(err); }
}
```

- [ ] **Step 2: Verificar endpoint**

Con el servidor corriendo (`npm run dev` en `server/`), ejecutar:
```bash
curl "http://localhost:5000/api/dashboard/actividad?page=1&limit=10" -H "Authorization: Bearer <token>"
```
Respuesta esperada: `{ success: true, data: [...], pagination: { total: N, page: 1, limit: 10, totalPages: M } }`

- [ ] **Step 3: Commit**

```bash
git add soporte-ti-istho/server/src/controllers/dashboardController.js
git commit -m "feat: paginación en actividadReciente del dashboard (page/limit params)"
```

---

## Task 5: Frontend — paginación actividad reciente en Dashboard (ítem 3)

**Files:**
- Modify: `soporte-ti-istho/client/src/services/dashboardService.js`
- Modify: `soporte-ti-istho/client/src/pages/DashboardPage.jsx`

- [ ] **Step 1: Actualizar dashboardService**

En `dashboardService.js`, cambiar la línea de `actividadReciente`:
```js
// Antes
actividadReciente: () => api.get('/dashboard/actividad'),

// Después
actividadReciente: (params = {}) => api.get('/dashboard/actividad', { params }),
```

- [ ] **Step 2: Actualizar DashboardPage — agregar estado de página**

En `DashboardPage.jsx`, agregar el estado de página junto a los demás `useState`:
```jsx
const [actividadPage, setActividadPage] = useState(1);
const [actividadPagination, setActividadPagination] = useState({ totalPages: 1 });
```

- [ ] **Step 3: Actualizar el useEffect inicial para usar page**

El `useEffect` actual (líneas 26-49) llama a `dashboardService.actividadReciente()` sin parámetros y guarda `act.data.data`. Cambiarlo para:

```jsx
useEffect(() => {
  Promise.all([
    dashboardService.resumen(),
    dashboardService.porTecnico(),
    dashboardService.tendencias(),
    dashboardService.metricasSLA(),
    dashboardService.actividadReciente({ page: 1, limit: 10 }),
  ])
    .then(([r, t, tr, sla, act]) => {
      setResumen(r.data.data);
      setTecnicos(t.data.data);
      setTendencias(tr.data.data);
      const raw = sla.data.data || [];
      setSlaMetrics(raw.map(item => ({
        prioridad: PRIORIDAD_LABEL[item.prioridad] || item.prioridad,
        Cumplidos: item.cumplidos,
        Vencidos: (item.total || 0) - (item.cumplidos || 0),
        pct: item.total > 0 ? Math.round((item.cumplidos / item.total) * 100) : 100,
      })));
      setActividad(act.data.data || []);
      setActividadPagination(act.data.pagination || { totalPages: 1 });
    })
    .catch(() => toast.error('Error cargando dashboard'))
    .finally(() => setLoading(false));
}, []);
```

- [ ] **Step 4: Agregar función para cambiar página**

Después del `useEffect`, agregar:
```jsx
const cargarActividad = useCallback(async (page) => {
  try {
    const res = await dashboardService.actividadReciente({ page, limit: 10 });
    setActividad(res.data.data || []);
    setActividadPagination(res.data.pagination || { totalPages: 1 });
    setActividadPage(page);
  } catch {
    toast.error('Error cargando actividad');
  }
}, []);
```

- [ ] **Step 5: Agregar Pagination bajo el feed de actividad**

Agregar `import { Pagination } from '../components/common/Pagination';` al inicio del archivo si no existe.

En el JSX de la sección "Actividad reciente" (Card al final del return), agregar `<Pagination>` después del `div` con los items:

```jsx
{/* Al final del Card de actividad, antes del cierre </Card>: */}
<Pagination
  page={actividadPage}
  totalPages={actividadPagination.totalPages}
  onChange={cargarActividad}
/>
```

- [ ] **Step 6: Verificar en navegador**

Ir a http://localhost:5173/dashboard. La sección "Actividad reciente" debe mostrar 10 items. Si hay más de 10 registros en la BD, aparecen controles de paginación (Pág X de Y) debajo.

- [ ] **Step 7: Commit**

```bash
git add soporte-ti-istho/client/src/services/dashboardService.js soporte-ti-istho/client/src/pages/DashboardPage.jsx
git commit -m "feat: paginación en sección actividad reciente del dashboard (10 items/pág)"
```

---

## Task 6: Navbar — notificaciones Opción C (ítem 4)

**Files:**
- Modify: `soporte-ti-istho/client/src/components/layout/Navbar.jsx`

Diseño aprobado: panel con botones ✓/✕ compactos a la derecha de cada ítem y barra de acciones globales fija al pie. Estado: solo React (`useState`), sin cambios de backend.

- [ ] **Step 1: Agregar estado para notificaciones con leído/borrado**

En `Navbar.jsx`, agregar función auxiliar y ajustar el handler `openBell` para que el estado de `notifs` sea inmutable por índice:

```jsx
// Después de: const [hasNew, setHasNew] = useState(true);
const marcarLeida = (id) =>
  setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));

const borrarNotif = (id) =>
  setNotifs(prev => prev.filter(n => n.id !== id));

const marcarTodasLeidas = () =>
  setNotifs(prev => prev.map(n => ({ ...n, leida: true })));

const borrarTodas = () => setNotifs([]);
```

- [ ] **Step 2: Reemplazar el panel del bell (bloque bellOpen)**

Localizar el bloque que empieza en `{bellOpen && (` (línea ~96) y reemplazar el `<div>` interior completo del panel:

```jsx
{bellOpen && (
  <>
    <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
    <div className="absolute right-0 mt-1 w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-navy-700 rounded-xl shadow-xl border border-slate-200 dark:border-navy-600 z-20 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-navy-600 flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-500 dark:text-white">Actividad reciente</p>
        {notifs && notifs.length > 0 && (
          <span className="text-xs text-slate-400">{notifs.filter(n => !n.leida).length} sin leer</span>
        )}
      </div>

      {/* Lista */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-navy-600">
        {loadingNotifs ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400">Cargando...</div>
        ) : !notifs || notifs.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400">Sin actividad reciente</div>
        ) : notifs.map(item => {
          const esCreacion = item.operacion === 'INSERT';
          const esCambioEstado = item.campo === 'estado';
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${item.leida ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-navy-600'}`}
            >
              <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${esCreacion ? 'bg-cgreen-100 dark:bg-cgreen-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                {esCreacion
                  ? <PlusCircle size={11} className="text-cgreen-600 dark:text-cgreen-400" />
                  : <RefreshCw size={11} className="text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                  <span className="font-semibold">{item.usuario}</span>
                  {esCreacion
                    ? <> creó <span className="font-mono text-orange-600 dark:text-orange-400">{item.solicitudNumero}</span></>
                    : esCambioEstado
                      ? <> → <span className="font-semibold">{ESTADOS_LABEL[item.estadoNuevo] || item.estadoNuevo}</span> en <span className="font-mono text-orange-600 dark:text-orange-400">{item.solicitudNumero}</span></>
                      : <> actualizó <span className="font-mono text-orange-600 dark:text-orange-400">{item.solicitudNumero}</span></>}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{formatRelativo(item.fecha)}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0 ml-1">
                <button
                  onClick={() => marcarLeida(item.id)}
                  disabled={item.leida}
                  title="Marcar como leído"
                  className="p-1 rounded text-cgreen-500 hover:bg-cgreen-50 dark:hover:bg-cgreen-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Check size={11} />
                </button>
                <button
                  onClick={() => borrarNotif(item.id)}
                  title="Borrar"
                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer acciones globales */}
      <div className="px-3 py-2.5 border-t border-slate-200 dark:border-navy-600 flex items-center gap-2">
        <NavLink
          to="/dashboard"
          onClick={() => setBellOpen(false)}
          className="text-xs text-orange-500 hover:text-orange-600 font-medium mr-auto"
        >
          Ver todo →
        </NavLink>
        <button
          onClick={marcarTodasLeidas}
          className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-navy-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-500 transition-colors"
        >
          Marcar leídas
        </button>
        <button
          onClick={borrarTodas}
          className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          Borrar todas
        </button>
      </div>
    </div>
  </>
)}
```

- [ ] **Step 3: Agregar import de `Check`**

En la línea de imports de lucide-react, agregar `Check` a la lista:
```jsx
import { LayoutDashboard, Ticket, Users, UserCog, LogOut, Menu, X, ChevronDown, BarChart2, Bell, PlusCircle, RefreshCw, Check } from 'lucide-react';
```

- [ ] **Step 4: Verificar en navegador**

1. En viewport 375px: Abrir el bell — el panel no debe salirse del borde derecho.
2. Hacer clic en ✓ de un item: debe ponerse semitransparente y el botón ✓ quedar deshabilitado.
3. Hacer clic en ✕ de un item: el item desaparece de la lista.
4. Botón "Marcar leídas": todos los items se vuelven semitransparentes.
5. Botón "Borrar todas": la lista queda vacía.

- [ ] **Step 5: Commit**

```bash
git add soporte-ti-istho/client/src/components/layout/Navbar.jsx
git commit -m "feat: rediseño menú notificaciones con acciones por ítem y pie de panel (ítem 4)"
```

---

## Task 7: Skeleton card + fix scroll SolicitudesPage (ítem 5)

**Files:**
- Modify: `soporte-ti-istho/client/src/components/common/Skeleton.jsx`
- Modify: `soporte-ti-istho/client/src/pages/SolicitudesPage.jsx`

- [ ] **Step 1: Agregar SkeletonCard a Skeleton.jsx**

Agregar al final de `Skeleton.jsx`:

```jsx
export function SkeletonCard({ rows = 4 }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-navy-600">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex items-center justify-between gap-2 mt-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Actualizar SolicitudesPage para usar SkeletonCard en móvil**

En `SolicitudesPage.jsx`, agregar `SkeletonCard` al import:
```jsx
import { SkeletonTable, SkeletonCard } from '../components/common/Skeleton';
```

Luego, cambiar el bloque de loading (actualmente `<div className="p-4"><SkeletonTable rows={5} cols={5} /></div>`):

```jsx
{loading ? (
  <>
    {/* Mobile skeleton */}
    <div className="block sm:hidden"><SkeletonCard rows={4} /></div>
    {/* Desktop skeleton */}
    <div className="hidden sm:block p-4"><SkeletonTable rows={5} cols={7} /></div>
  </>
) : solicitudes.length === 0 ? (
```

- [ ] **Step 3: Eliminar scroll vertical innecesario**

Buscar en `SolicitudesPage.jsx` si el `<Card>` principal de la lista tiene `overflow-y` o `min-h` explícito que cause espacio blanco. El Card wrapper es `<Card className="overflow-hidden">` — verificar que no tenga `min-h` en la cadena de CSS. Si lo tiene, eliminarlo.

Si el scroll proviene del `<div className="p-4">` del SkeletonTable, el paso anterior (reemplazar con SkeletonCard sin padding wrapper) ya lo resuelve.

- [ ] **Step 4: Verificar en navegador**

En http://localhost:5173/solicitudes en viewport 375px, recargar la página. El skeleton durante la carga debe mostrar 4 tarjetas que imitan la forma de las cards reales, sin generar espacio blanco extra debajo.

- [ ] **Step 5: Commit**

```bash
git add soporte-ti-istho/client/src/components/common/Skeleton.jsx soporte-ti-istho/client/src/pages/SolicitudesPage.jsx
git commit -m "feat: agregar SkeletonCard para loading móvil en SolicitudesPage (ítem 5)"
```

---

## Task 8: Hora en Excel y fechaResolucion en SolicitudModal (ítem 7)

**Files:**
- Modify: `soporte-ti-istho/server/src/controllers/reportesController.js:102-116`
- Modify: `soporte-ti-istho/client/src/components/solicitudes/SolicitudModal.jsx`

**Contexto:** El frontend ya usa `formatFecha` (incluye `HH:mm`) en todas las columnas de fecha. El único gap es el Excel export que usa `toLocaleDateString` (sin hora) y la ausencia de un campo "Fecha resolución" visible en el modal.

- [ ] **Step 1: Actualizar fechas en el Excel**

En `reportesController.js`, dentro de la función `exportarExcel`, localizar el array `dataRows` (líneas ~102-116):

```js
// Cambiar estas dos líneas dentro de dataRows:
// Línea de fechaCreacion (columna 2):
s.fechaCreacion ? new Date(s.fechaCreacion).toLocaleDateString('es-CO') : '',
// →
s.fechaCreacion
  ? new Date(s.fechaCreacion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  : '',

// Línea de fechaResolucion (columna 13):
s.fechaResolucion ? new Date(s.fechaResolucion).toLocaleDateString('es-CO') : '',
// →
s.fechaResolucion
  ? new Date(s.fechaResolucion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  : '',
```

- [ ] **Step 2: Agregar fechaResolucion en SolicitudModal**

En `SolicitudModal.jsx`, el bloque de `sol.fechaResolucion` (línea ~126) actualmente muestra `tiempoResolucionMinutos`. Agregar la fecha de resolución como campo adicional:

Localizar:
```jsx
{sol.fechaResolucion && (
  <div>
    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tiempo resolución</p>
    <p className="text-slate-700 dark:text-slate-300">{formatMinutos(sol.tiempoResolucionMinutos)}</p>
```

Agregar el campo de fecha resolución inmediatamente después del cierre de ese div:
```jsx
{sol.fechaResolucion && (
  <div>
    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Fecha resolución</p>
    <p className="text-slate-700 dark:text-slate-300">{formatFecha(sol.fechaResolucion)}</p>
  </div>
)}
```

- [ ] **Step 3: Verificar Excel**

Exportar un reporte desde http://localhost:5173/reportes. Abrir el Excel generado. Las columnas "Fecha creación" y "Fecha resolución" deben mostrar fecha y hora (ej: `5/8/2026 14:30`).

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/server/src/controllers/reportesController.js soporte-ti-istho/client/src/components/solicitudes/SolicitudModal.jsx
git commit -m "feat: agregar hora a fechas en Excel export y campo fecha resolución en modal (ítem 7)"
```

---

## Task 9: Backend reportes — query topEmpleados (ítem 8B)

**Files:**
- Modify: `soporte-ti-istho/server/src/controllers/reportesController.js`

`obtenerDatos(where)` ya hace JOIN con `Empleado` y devuelve `s.empleado.nombreCompleto`. Se computa `topEmpleados` en memoria desde ese array — sin query adicional, sin riesgo de problemas con MySQL `ONLY_FULL_GROUP_BY`.

- [ ] **Step 1: Agregar cálculo topEmpleados en función resumen**

En `reportesController.js`, la función `resumen` tiene el `forEach` que calcula `porEstado`, `porPrioridad`, etc. Agregar el cómputo de `topEmpleados` después del `forEach` y antes de `res.json(...)`:

```js
// Después del forEach y antes de res.json:
const empCount = {};
solicitudes.forEach(s => {
  const nombre = s.empleado?.nombreCompleto;
  if (!nombre) return;
  empCount[nombre] = (empCount[nombre] || 0) + 1;
});
const topEmpleados = Object.entries(empCount)
  .map(([nombre, total]) => ({
    nombre,
    total,
    porcentaje: solicitudes.length > 0 ? Math.round((total / solicitudes.length) * 100) : 0,
  }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 10);
```

Agregar `topEmpleados` al objeto de respuesta:

```js
res.json({
  success: true,
  data: {
    total: solicitudes.length,
    porEstado,
    porPrioridad,
    porTipo,
    porTecnico,
    tiempoPromedioResolucion: totalResueltos ? Math.round(sumaTiempo / totalResueltos) : null,
    slaVencidos,
    cumplimientoSLA: solicitudes.length
      ? Math.round(((solicitudes.length - slaVencidos) / solicitudes.length) * 100)
      : 100,
    topEmpleados,  // <-- nuevo campo
  },
});
```

- [ ] **Step 2: Verificar endpoint**

```bash
curl "http://localhost:5000/api/reportes/resumen" -H "Authorization: Bearer <token>"
```
La respuesta debe incluir `"topEmpleados": [{ "nombre": "...", "total": N, "porcentaje": N }, ...]`

- [ ] **Step 3: Commit**

```bash
git add soporte-ti-istho/server/src/controllers/reportesController.js
git commit -m "feat: agregar topEmpleados al endpoint de resumen de reportes (ítem 8B backend)"
```

---

## Task 10: Frontend Reportes — donut tipos + tabla top empleados (ítems 8A + 8B)

**Files:**
- Modify: `soporte-ti-istho/client/src/pages/ReportesPage.jsx`

- [ ] **Step 1: Agregar imports de Recharts y PieChart**

`ReportesPage.jsx` no tiene imports de Recharts. Agregar al inicio del archivo:

```jsx
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, Legend, ResponsiveContainer,
} from 'recharts';
```

- [ ] **Step 2: Definir paleta de colores del donut**

Después de la función `ResumenCard`, agregar:

```jsx
const TIPO_COLORS = ['#E8531E', '#1B2340', '#4C8C2B', '#3B82F6', '#F59E0B', '#8B5CF6', '#64748B', '#DC2626', '#0891B2'];
```

- [ ] **Step 3: Agregar sección tipos frecuentes (donut)**

Después de la sección "Distribución" (el grid de 3 cards `porEstado / porPrioridad / porTécnico`), agregar una nueva sección antes de la tabla:

```jsx
{/* Análisis adicional */}
{resumen && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Tipos más frecuentes — donut */}
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
        <TrendingUp size={15} className="text-orange-500" /> Tipos de solicitud más frecuentes
      </h3>
      {(() => {
        const data = Object.entries(resumen.porTipo || {})
          .map(([tipo, n]) => ({ name: TIPOS_SOLICITUD_LABEL[tipo] || tipo, value: n }))
          .sort((a, b) => b.value - a.value);
        if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-6">Sin datos</p>;
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={TIPO_COLORS[i % TIPO_COLORS.length]} />
                ))}
              </Pie>
              <RechartTooltip formatter={(val, name) => [val, name]} />
              <Legend
                formatter={(val) => <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      })()}
    </Card>

    {/* Top empleados — tabla */}
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
        <TrendingUp size={15} className="text-orange-500" /> Empleados con más solicitudes
      </h3>
      {(!resumen.topEmpleados || resumen.topEmpleados.length === 0) ? (
        <p className="text-sm text-slate-400 text-center py-6">Sin datos</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-navy-600">
                <th className="text-left pb-2 pr-4">#</th>
                <th className="text-left pb-2 pr-4">Empleado</th>
                <th className="text-right pb-2 pr-4">Solicitudes</th>
                <th className="text-right pb-2">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {resumen.topEmpleados.map((emp, i) => (
                <tr key={emp.nombre} className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                  <td className="py-2.5 pr-4 text-xs font-bold text-slate-400">{i + 1}</td>
                  <td className="py-2.5 pr-4 font-medium text-navy-500 dark:text-white">{emp.nombre}</td>
                  <td className="py-2.5 pr-4 text-right font-bold text-navy-500 dark:text-white">{emp.total}</td>
                  <td className="py-2.5 text-right">
                    <span className="text-xs font-semibold text-orange-500">{emp.porcentaje}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  </div>
)}
```

- [ ] **Step 4: Verificar en navegador**

Ir a http://localhost:5173/reportes. Aplicar un filtro para asegurarse de que hay datos. Deben aparecer dos nuevas cards:
1. Un donut chart con los tipos de solicitud (colores variados, leyenda).
2. Una tabla con empleados ordenados por cantidad de solicitudes + columna de porcentaje.

- [ ] **Step 5: Commit**

```bash
git add soporte-ti-istho/client/src/pages/ReportesPage.jsx
git commit -m "feat: nuevas secciones de reportes — tipos frecuentes (donut) y top empleados (ítem 8)"
```

---

## Task 11: Animación de entrada en Modal y dropdowns (ítem 9)

**Files:**
- Modify: `soporte-ti-istho/client/src/components/common/Modal.jsx`
- Modify: `soporte-ti-istho/client/src/components/layout/Navbar.jsx`

- [ ] **Step 1: Animación de entrada en Modal**

En `Modal.jsx`, el backdrop y el panel aparecen instantáneamente. Agregar animación de fade/slide con Tailwind. Cambiar el div del panel (línea 18):

```jsx
// Antes
<div className={`relative w-full ${sizes[size]} bg-white dark:bg-navy-700 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col`}>

// Después
<div className={`relative w-full ${sizes[size]} bg-white dark:bg-navy-700 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-[slideUp_0.2s_ease-out]`}>
```

Cambiar el backdrop (línea 17):
```jsx
// Antes
<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

// Después
<div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease]" onClick={onClose} />
```

Definir los keyframes en `soporte-ti-istho/client/src/index.css` (dentro del bloque `@theme {}` o en una capa separada, fuera de `@theme`):

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Transición en dropdowns del Navbar**

En `Navbar.jsx`, el menú de usuario y el mobile menu aparecen sin transición. Agregar `transition-all duration-200` al div del menú de usuario:

```jsx
// Menú usuario (línea ~164):
// Cambiar className del div interno del userMenu:
<div className="absolute right-0 mt-1 w-48 bg-white dark:bg-navy-700 rounded-xl shadow-lg border border-slate-200 dark:border-navy-600 z-20 py-1 animate-[fadeIn_0.15s_ease]">
```

Para el mobile menu, agregar `animate-[fadeIn_0.15s_ease]`:
```jsx
// Mobile menu (línea ~197):
<div className="md:hidden pb-3 space-y-1 animate-[fadeIn_0.15s_ease]">
```

- [ ] **Step 3: Verificar en navegador**

1. Abrir cualquier modal (crear solicitud): el backdrop y el panel deben aparecer con una animación suave de fade/slide (no instantánea).
2. Abrir el menú de usuario: debe hacer fade in.
3. En móvil, abrir el menú hamburguesa: debe hacer fade in.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/client/src/components/common/Modal.jsx soporte-ti-istho/client/src/components/layout/Navbar.jsx soporte-ti-istho/client/src/index.css
git commit -m "feat: animaciones de entrada en modales y menús desplegables (ítem 9)"
```

---

## Verificación final

- [ ] **Verificar todos los ítems**

| Ítem | Verificación |
|------|-------------|
| 1 — Overflow | En 375px, ninguna página genera scroll horizontal |
| 2 — Error consola | CLAUDE.md menciona el error como ruido de extensión |
| 3 — Paginación actividad | Dashboard muestra 10 items y controles de página |
| 4 — Notificaciones | Panel no se recorta en móvil; ✓/✕ por item; "Marcar leídas" / "Borrar todas" |
| 5 — Skeleton | Loading en SolicitudesPage muestra cards en móvil, tabla en escritorio |
| 6 — Fecha móvil | DatePicker en ReportesPage no se recorta en 375px |
| 7 — Hora en fechas | Excel descargado incluye hora en "Fecha creación" y "Fecha resolución" |
| 8 — Nuevas secciones | ReportesPage muestra donut de tipos y tabla de top empleados |
| 9 — Animaciones | Modales y dropdowns tienen fade de entrada |
| Extra — Select nativo | UsuariosPage usa componente Select personalizado en campo Rol |

- [ ] **Commit final si hay cambios sin commitear**

```bash
git status
# Solo si hay cambios pendientes:
git add -A && git commit -m "chore: ajustes finales de verificación"
```
