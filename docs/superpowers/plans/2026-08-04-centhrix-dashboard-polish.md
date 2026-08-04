# Centhrix Dashboard Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer expandibles 2 de las 4 tarjetas KPI del Dashboard, volver clicable la actividad reciente, diferenciar estados vacíos en Solicitudes/Empleados, y mejorar un mensaje de validación en Perfil — cerrando la brecha entre el mockup de diseño Centhrix y el código ya rediseñado, sin tocar el backend.

**Architecture:** 4 cambios independientes, todos frontend-only (React 19 + Tailwind v4 + sistema de diseño Centhrix `cx-*`), reutilizando datos ya obtenidos por cada página — ninguna llamada nueva al backend.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, sistema de diseño Centhrix (clases `cx-*`, tokens CSS `--color-*`/`--radius-*`).

## Global Constraints

- No hay framework de test automatizado en `soporte-ti-istho/client/` (sin Jest/Vitest, solo ESLint) — la verificación de cada tarea es `npm run build` + inspección manual del código/comportamiento esperado.
- No agregar llamadas nuevas al backend — todos los cambios de este plan reutilizan datos que las páginas ya obtienen.
- Seguir el sistema de diseño Centhrix existente: clases `cx-*` y tokens `--color-*`/`--radius-*`/`--font-*`, nunca clases Tailwind `navy-`/`orange-`/`cgreen-` (esas pertenecen al sistema visual anterior, no tocado por este plan).
- No hay herramienta de automatización de navegador disponible en este entorno — la verificación interactiva (clics, expandir/colapsar) se confirma por lectura cuidadosa del JSX resultante, no por una prueba E2E real; se recomienda una pasada manual del usuario en el navegador antes de dar por cerrado el trabajo.

---

### Task 1: Dashboard — KPIs expandibles con desglose por estado

**Files:**
- Modify: `soporte-ti-istho/client/src/pages/DashboardPage.jsx:77-120`

**Interfaces:**
- Consumes: `estados` (array `{ estado, total, ... }`, ya calculado en `DashboardPage.jsx:87` desde `tendencias.porEstado`, filtrado a `total > 0`), `ESTADOS_LABEL` (ya importado desde `../utils/constants`, línea 8), `resumen` (objeto del estado del componente).
- Produces: nada consumido por otras tareas — el resto del plan no depende de esto.

- [ ] **Step 1: Mover y reescribir el array `kpis`, agregando los desgloses**

El array `kpis` actual está definido en `DashboardPage.jsx:77-82`, **antes** de que `estados` exista (`estados` se define en la línea 87). Hay que eliminar el bloque actual de esa posición y volver a insertarlo **después** de la definición de `estados` (después de la línea 87, antes de la línea 88 `const donutTotal = ...` — es decir, entre el cálculo de `estados` y el de `donutTotal`).

Eliminar de `DashboardPage.jsx:77-82`:

```js
  const kpis = [
    { label: 'Total Tickets', value: resumen?.total ?? '-', meta: null },
    { label: 'Solicitudes abiertas', value: resumen?.abiertos ?? '-', meta: `${resumen?.enProceso ?? 0} en proceso` },
    { label: 'Vencidos', value: resumen?.vencidos ?? '-', meta: null },
    { label: 'Cumplimiento SLA', value: resumen ? `${resumen.porcentajeCumplimiento ?? 0}%` : '-', meta: `${resumen?.resueltos ?? 0} resueltos` },
  ];
```

Dejando esa zona así (línea 76-84 tras el borrado):

```js
  const dias = (tendencias?.porDia || []).slice(-7);
  const maxDia = Math.max(1, ...dias.map(d => d.total));

  const estados = (tendencias?.porEstado || []).filter(e => e.total > 0);
```

Insertar el nuevo bloque justo después de esa línea de `estados` (antes de `const donutTotal = ...`):

```js
  const estados = (tendencias?.porEstado || []).filter(e => e.total > 0);

  const ESTADOS_ABIERTOS = ['abierto', 'en_analisis', 'en_proceso', 'pendiente_usuario', 'pendiente_externo'];
  const breakdownEstados = estados.map(e => ({ label: ESTADOS_LABEL[e.estado] || e.estado, value: e.total }));
  const breakdownAbiertos = estados.filter(e => ESTADOS_ABIERTOS.includes(e.estado)).map(e => ({ label: ESTADOS_LABEL[e.estado] || e.estado, value: e.total }));

  const kpis = [
    { key: 'total', label: 'Total Tickets', value: resumen?.total ?? '-', meta: null, breakdown: breakdownEstados },
    { key: 'abiertas', label: 'Solicitudes abiertas', value: resumen?.abiertos ?? '-', meta: `${resumen?.enProceso ?? 0} en proceso`, breakdown: breakdownAbiertos },
    { key: 'vencidos', label: 'Vencidos', value: resumen?.vencidos ?? '-', meta: null, breakdown: null },
    { key: 'sla', label: 'Cumplimiento SLA', value: resumen ? `${resumen.porcentajeCumplimiento ?? 0}%` : '-', meta: `${resumen?.resueltos ?? 0} resueltos`, breakdown: null },
  ];

  const donutTotal = estados.reduce((a, e) => a + e.total, 0);
```

(La última línea `const donutTotal = ...` ya existe — solo se muestra aquí para confirmar el punto exacto de inserción; no se duplica.)

- [ ] **Step 2: Agregar el estado `kpiAbierto`**

En la lista de `useState` del componente (`DashboardPage.jsx:38`, justo después de `const [estadoActivo, setEstadoActivo] = useState(null);`), agregar:

```js
  const [kpiAbierto, setKpiAbierto] = useState(null);
```

- [ ] **Step 3: Reemplazar el JSX de las tarjetas KPI**

Reemplazar el bloque completo `DashboardPage.jsx:112-120`:

```jsx
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} className="cx-card cx-elev-sm" style={{ padding: 18 }}>
            <p className="cx-card-kicker" style={{ margin: 0 }}>{k.label}</p>
            {loading ? <div className="cx-skeleton" style={{ height: 26, width: '50%', marginTop: 6 }} /> : <p className="cx-card-kpi-value">{k.value}</p>}
            {k.meta && !loading && <p className="cx-card-meta">{k.meta}</p>}
          </div>
        ))}
      </div>
```

por:

```jsx
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginBottom: 20 }}>
        {kpis.map(k => {
          const expandible = !!k.breakdown && k.breakdown.length > 0;
          const abierto = kpiAbierto === k.key;
          return (
            <div
              key={k.key}
              className="cx-card cx-elev-sm"
              style={{ padding: 18, cursor: expandible ? 'pointer' : 'default' }}
              onClick={expandible ? () => setKpiAbierto(abierto ? null : k.key) : undefined}
            >
              <p className="cx-card-kicker" style={{ margin: 0 }}>{k.label}</p>
              {loading ? <div className="cx-skeleton" style={{ height: 26, width: '50%', marginTop: 6 }} /> : <p className="cx-card-kpi-value">{k.value}</p>}
              {k.meta && !loading && <p className="cx-card-meta">{k.meta}</p>}
              {expandible && abierto && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {k.breakdown.map(b => (
                    <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                      <span className="text-muted">{b.label}</span>
                      <strong>{b.value}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
```

- [ ] **Step 4: Verificar que compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores (warnings de tamaño de chunk preexistentes son aceptables, no relacionados con este cambio).

- [ ] **Step 5: Verificación manual del comportamiento**

Levantar el dev server (`npm run dev`) y en el navegador, autenticado como admin/técnico, ir a `/dashboard`. Confirmar:
- Las tarjetas "Total Tickets" y "Solicitudes abiertas" muestran `cursor:pointer` al pasar el mouse.
- Clic en "Total Tickets" despliega una lista de estados con sus conteos (debe sumar el mismo total que la tarjeta).
- Clic en "Solicitudes abiertas" despliega solo los estados considerados "abiertos" (abierto, en análisis, en proceso, pendiente usuario, pendiente externo).
- Clic de nuevo en la misma tarjeta la colapsa. Clic en la otra tarjeta expandible cierra la primera y abre la segunda.
- Las tarjetas "Vencidos" y "Cumplimiento SLA" no reaccionan al clic (sin cursor pointer, sin desglose).

Detener el dev server al terminar.

- [ ] **Step 6: Commit**

```bash
git add soporte-ti-istho/client/src/pages/DashboardPage.jsx
git commit -m "feat: tarjetas KPI expandibles con desglose por estado en Dashboard"
```

---

### Task 2: Dashboard — Actividad reciente clicable

**Files:**
- Modify: `soporte-ti-istho/client/src/pages/DashboardPage.jsx:261` (el `<div>` contenedor de cada fila de actividad)

**Interfaces:**
- Consumes: `item.solicitudNumero` (ya presente en cada elemento de `actividad`, usado en el JSX existente en las líneas 269-272), `navigate` (ya importado vía `useNavigate()`, línea 29 — ya usado en el patrón idéntico de la fila de técnico, línea 228).
- Produces: nada consumido por otras tareas.

- [ ] **Step 1: Agregar `onClick` y `cursor:pointer` a la fila de actividad**

Reemplazar en `DashboardPage.jsx:261`:

```jsx
                  <div key={item.id} style={{ display: 'flex', gap: 12, padding: '12px 10px', margin: '0 -10px', borderBottom: '1px solid var(--color-border)', borderRadius: 8 }}>
```

por:

```jsx
                  <div
                    key={item.id}
                    style={{ display: 'flex', gap: 12, padding: '12px 10px', margin: '0 -10px', borderBottom: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
                    onClick={() => navigate('/solicitudes', { state: { search: item.solicitudNumero } })}
                  >
```

- [ ] **Step 2: Verificar que compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores.

- [ ] **Step 3: Verificación manual del comportamiento**

Levantar el dev server, ir a `/dashboard` autenticado. Confirmar:
- Cada fila de "Actividad reciente" muestra `cursor:pointer` al pasar el mouse.
- Clic en una fila navega a `/solicitudes` y el campo de búsqueda queda prellenado con el número de ticket de esa fila (mismo comportamiento ya existente al hacer clic en una fila de la tabla de técnicos — confirmar que ambos casos usan `location.state.search` de la misma forma).

Detener el dev server al terminar.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/client/src/pages/DashboardPage.jsx
git commit -m "feat: fila de actividad reciente navega al ticket filtrado en Solicitudes"
```

---

### Task 3: Estados vacíos diferenciados en Solicitudes y Empleados

**Files:**
- Modify: `soporte-ti-istho/client/src/pages/SolicitudesPage.jsx:30, 181-185`
- Modify: `soporte-ti-istho/client/src/pages/EmpleadosPage.jsx:73, 145-149`

**Interfaces:**
- Consumes (Solicitudes): `filters` (estado existente, `{ estado, prioridad, search }`, `SolicitudesPage.jsx:30`), `setFilters`, `setSearchInput` (ya existe, línea 39).
- Consumes (Empleados): `search`/`setSearch` (ya existe, `EmpleadosPage.jsx:73`).
- Produces: nada consumido por otras tareas.

- [ ] **Step 1: Solicitudes — agregar `hayFiltrosActivos` y `limpiarFiltros`**

En `SolicitudesPage.jsx`, justo después de la línea 30 (`const [filters, setFilters] = useState({ estado: '', prioridad: '', search: location.state?.search || '' });`), agregar:

```js
  const hayFiltrosActivos = !!(filters.search || filters.estado || filters.prioridad);
  const limpiarFiltros = () => {
    setSearchInput('');
    setFilters({ estado: '', prioridad: '', search: '' });
  };
```

Nota: `setSearchInput` se usa aquí pero se define más abajo en el archivo (línea 39, `const [searchInput, setSearchInput] = useState(filters.search);`) — en JavaScript esto es válido porque `limpiarFiltros` es una función que se ejecuta después del render inicial completo (al hacer clic), no durante la evaluación de este bloque; para mayor claridad, colocar el bloque de `hayFiltrosActivos`/`limpiarFiltros` **después** de la línea 39 (después de la declaración de `searchInput`) en vez de justo tras la línea 30, evitando cualquier duda sobre orden de declaración.

- [ ] **Step 2: Solicitudes — reemplazar el bloque de estado vacío**

Reemplazar en `SolicitudesPage.jsx:181-185`:

```jsx
        ) : solicitudes.length === 0 ? (
          <div className="cx-empty" style={{ border: 'none', padding: '44px 24px' }}>
            <div className="cx-empty-icon"><Ticket size={24} /></div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '6px 0 0' }}>No hay solicitudes</p>
          </div>
        ) : (
```

por:

```jsx
        ) : solicitudes.length === 0 ? (
          <div className="cx-empty" style={{ border: 'none', padding: '44px 24px' }}>
            <div className="cx-empty-icon"><Ticket size={24} /></div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '6px 0 0' }}>
              {hayFiltrosActivos ? 'Sin coincidencias' : 'No hay solicitudes'}
            </p>
            {hayFiltrosActivos && (
              <button type="button" className="cx-btn cx-btn-ghost" style={{ marginTop: 10 }} onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
```

- [ ] **Step 3: Empleados — agregar `hayBusquedaActiva` y `limpiarBusqueda`**

En `EmpleadosPage.jsx`, justo después de la línea 73 (`const [search, setSearch] = useState('');`), agregar:

```js
  const hayBusquedaActiva = !!search;
  const limpiarBusqueda = () => setSearch('');
```

- [ ] **Step 4: Empleados — reemplazar el bloque de estado vacío**

Reemplazar en `EmpleadosPage.jsx:145-149`:

```jsx
        ) : empleados.length === 0 ? (
          <div className="cx-empty" style={{ border: 'none', padding: '44px 24px' }}>
            <div className="cx-empty-icon"><Users size={24} /></div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '6px 0 0' }}>No hay empleados</p>
          </div>
        ) : (
```

por:

```jsx
        ) : empleados.length === 0 ? (
          <div className="cx-empty" style={{ border: 'none', padding: '44px 24px' }}>
            <div className="cx-empty-icon"><Users size={24} /></div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '6px 0 0' }}>
              {hayBusquedaActiva ? 'Sin coincidencias' : 'No hay empleados'}
            </p>
            {hayBusquedaActiva && (
              <button type="button" className="cx-btn cx-btn-ghost" style={{ marginTop: 10 }} onClick={limpiarBusqueda}>
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
```

- [ ] **Step 5: Verificar que compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores.

- [ ] **Step 6: Verificación manual del comportamiento**

Levantar el dev server. En `/solicitudes`: buscar un texto que no coincida con ningún ticket → confirmar que aparece "Sin coincidencias" y el botón "Limpiar filtros"; hacer clic en el botón → confirmar que el buscador se vacía y la tabla vuelve a mostrar resultados. Repetir el mismo flujo en `/empleados` con "Sin coincidencias"/"Limpiar búsqueda". Si es posible verificar con una cuenta/DB donde la lista esté genuinamente vacía sin filtros, confirmar que se sigue mostrando "No hay solicitudes"/"No hay empleados" sin el botón.

Detener el dev server al terminar.

- [ ] **Step 7: Commit**

```bash
git add soporte-ti-istho/client/src/pages/SolicitudesPage.jsx soporte-ti-istho/client/src/pages/EmpleadosPage.jsx
git commit -m "feat: diferenciar estado vacio por filtros activos en Solicitudes y Empleados"
```

---

### Task 4: Perfil — mensaje de validación de contraseña actual

**Files:**
- Modify: `soporte-ti-istho/client/src/pages/PerfilPage.jsx:12`

**Interfaces:**
- Ninguna — cambio de un literal de texto dentro de un schema `zod` ya existente.

- [ ] **Step 1: Cambiar el mensaje de validación**

Reemplazar en `PerfilPage.jsx:12`:

```js
  passwordActual: z.string().min(1, 'Requerido'),
```

por:

```js
  passwordActual: z.string().min(1, 'La contraseña actual es requerida'),
```

- [ ] **Step 2: Verificar que compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores.

- [ ] **Step 3: Verificación manual del comportamiento**

Levantar el dev server, ir a `/perfil` autenticado, dejar "Contraseña actual" vacío, llenar los otros dos campos, e intentar enviar. Confirmar que el mensaje bajo el campo dice "La contraseña actual es requerida".

Detener el dev server al terminar.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/client/src/pages/PerfilPage.jsx
git commit -m "fix: mensaje de validacion mas especifico para contrasena actual vacia en Perfil"
```
