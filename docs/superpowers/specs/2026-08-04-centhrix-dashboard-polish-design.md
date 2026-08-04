# Centhrix: Dashboard expandible, actividad clicable y estados vacíos — Design

## Alcance

Este spec cubre la primera pieza de un conjunto de mejoras identificadas al auditar el mockup de diseño "SIST Centhrix Mockup" (`claude.ai/design/p/bda29ac7-2eee-4a7c-b859-18999e89f203`) contra el código ya rediseñado en el commit `034a506`. La auditoría comparó las 9 pantallas del mockup (Login, Home, Solicitud Pública, Navbar/AppShell, Dashboard, Solicitudes, Empleados, Usuarios, Perfil) contra su implementación real, pantalla por pantalla.

Alcance de este spec — solo cambios de bajo riesgo, sin impacto de API:

1. **Dashboard**: tarjetas KPI "Total Tickets" y "Solicitudes abiertas" se vuelven expandibles con desglose por estado (clic para mostrar/ocultar).
2. **Dashboard**: filas de "Actividad reciente" navegan a Solicitudes filtrado por el número de ticket, igual que ya hace la fila de técnico.
3. **Solicitudes** y **Empleados**: estado vacío diferenciado — "sin coincidencias" con botón para limpiar filtros, vs. el mensaje genérico actual cuando no hay ningún filtro aplicado.
4. **Perfil**: mensaje de validación más específico cuando el campo "contraseña actual" queda vacío.

**Explícitamente fuera de alcance** (quedan documentados para un spec posterior, requieren decisiones de API):
- Columnas ordenables en la tabla de Solicitudes.
- Filtros de múltiple selección (varios estados/prioridades a la vez) en Solicitudes.
- Un KPI de "vencimientos próximos" predictivo (el mockup lo mostraba, pero es conceptualmente distinto al "Vencidos" actual y no hay soporte de backend).
- El bug de límite de archivos en Solicitud Pública (frontend permite 5, backend `multer` limita a 3) — es un bug de producción real e independiente del rediseño, se atiende aparte.
- Todo el subsistema de Formularios (builder, PDFMapper, respuestas) y `ReportesPage`/`DatePicker` — el mockup los trata como "próximamente" pero ya existen y funcionan; su rediseño visual no viene resuelto por este mockup y necesita su propio spec.

Dos hallazgos del mockup se descartan explícitamente por ser inferiores a lo ya implementado — **no se tocan**: la campana de notificaciones (real ya tiene marcar-leída/borrar/paginación; el mockup es decorativo) y el cambio de estado en el modal de Solicitud (real ya valida transiciones contra una máquina de estados; el mockup permite cualquiera).

---

## 1. Dashboard — KPIs expandibles

### Modelo de datos (solo frontend, sin llamadas nuevas al backend)

`DashboardPage.jsx` ya calcula `estados` (línea 87): array de `{ estado, total, ... }` derivado de `tendencias.porEstado`, filtrado a `total > 0`. Este mismo array alimenta el donut y se reutiliza aquí.

Reemplazar el array `kpis` (`DashboardPage.jsx:77-82`):

```js
const ESTADOS_ABIERTOS = ['abierto', 'en_analisis', 'en_proceso', 'pendiente_usuario', 'pendiente_externo'];

const breakdownEstados = estados.map(e => ({ label: ESTADOS_LABEL[e.estado] || e.estado, value: e.total }));
const breakdownAbiertos = estados.filter(e => ESTADOS_ABIERTOS.includes(e.estado)).map(e => ({ label: ESTADOS_LABEL[e.estado] || e.estado, value: e.total }));

const kpis = [
  { key: 'total', label: 'Total Tickets', value: resumen?.total ?? '-', meta: null, breakdown: breakdownEstados },
  { key: 'abiertas', label: 'Solicitudes abiertas', value: resumen?.abiertos ?? '-', meta: `${resumen?.enProceso ?? 0} en proceso`, breakdown: breakdownAbiertos },
  { key: 'vencidos', label: 'Vencidos', value: resumen?.vencidos ?? '-', meta: null, breakdown: null },
  { key: 'sla', label: 'Cumplimiento SLA', value: resumen ? `${resumen.porcentajeCumplimiento ?? 0}%` : '-', meta: `${resumen?.resueltos ?? 0} resueltos`, breakdown: null },
];
```

`breakdownEstados`/`breakdownAbiertos` deben calcularse **después** de que `estados` esté definido (línea 87), así que el array `kpis` se mueve a después de ese punto (actualmente está antes, línea 77 vs 87 — hay que reordenar).

### Estado y render

Nuevo estado: `const [kpiAbierto, setKpiAbierto] = useState(null);` — guarda el `key` del KPI expandido, o `null`. Cada tarjeta expandible alterna independientemente (clic en la misma vuelve a cerrar; clic en otra abre esa y cierra la anterior — un solo `kpiAbierto` a la vez, más simple que el mockup que los hacía independientes entre sí, sin cambio de comportamiento visible para el usuario ya que solo hay 2 expandibles).

Reemplazar el bloque de tarjetas KPI (`DashboardPage.jsx:112-120`):

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

Al cambiar `estados` (recarga de datos), `kpiAbierto` no se resetea automáticamente — es aceptable, ya que la página no recarga `estados` fuera del mount inicial en este spec.

---

## 2. Dashboard — Actividad reciente clicable

Cada item de actividad expone `item.solicitudNumero` (visible ya en el JSX, `DashboardPage.jsx:269-272`). Se agrega navegación reutilizando exactamente el mismo patrón ya usado en la fila de técnico (`DashboardPage.jsx:228`: `onClick={() => navigate('/solicitudes', { state: { search: t.nombre } })}`), confirmado que el backend (`solicitudController.js:48`) ya busca por `numero` con `LIKE`.

Modificar el `<div>` contenedor de cada fila de actividad (`DashboardPage.jsx:261`):

```jsx
<div
  key={item.id}
  style={{ display: 'flex', gap: 12, padding: '12px 10px', margin: '0 -10px', borderBottom: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
  onClick={() => navigate('/solicitudes', { state: { search: item.solicitudNumero } })}
>
```

Esto filtra Solicitudes al ticket correspondiente; el usuario hace clic en la fila filtrada para abrir el modal de detalle, igual que ya ocurre hoy al llegar desde la fila de técnico. No se introduce un mecanismo nuevo de "abrir modal directamente vía navegación" — el filtrado ya resuelve el caso de uso.

---

## 3. Estados vacíos diferenciados

### Solicitudes (`SolicitudesPage.jsx`)

Nueva variable derivada (después de la definición de `filters`, línea 30):

```js
const hayFiltrosActivos = !!(filters.search || filters.estado || filters.prioridad);
const limpiarFiltros = () => {
  setSearchInput('');
  setFilters({ estado: '', prioridad: '', search: '' });
};
```

Reemplazar el bloque de estado vacío (`SolicitudesPage.jsx:181-185`):

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

Nota: los filtros de estado/prioridad en `SolicitudesPage` ya se aplican como pills que llaman `setFilters` — no es necesario tocar esos handlers, solo el botón nuevo que resetea todo a la vez.

### Empleados (`EmpleadosPage.jsx`)

Mismo patrón, más simple (un solo campo `search`, sin `estado`/`prioridad`):

```js
const hayBusquedaActiva = !!search;
const limpiarBusqueda = () => setSearch('');
```

Reemplazar el bloque de estado vacío (`EmpleadosPage.jsx:145-149`):

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

---

## 4. Perfil — copy de validación

Un solo cambio en el schema zod de `PerfilPage.jsx:12`:

```js
// antes
passwordActual: z.string().min(1, 'Requerido'),
// después
passwordActual: z.string().min(1, 'La contraseña actual es requerida'),
```

---

## Testing

No hay framework de test automatizado en `client/` (confirmado: no hay Jest/Vitest configurado, solo ESLint). La verificación es manual: `npm run build` para confirmar que compila, y una pasada visual en el navegador cubriendo:
- Dashboard: clic en "Total Tickets" y "Solicitudes abiertas" abre/cierra el desglose; clic en "Vencidos"/"Cumplimiento SLA" no hace nada (sin cursor pointer).
- Dashboard: clic en una fila de actividad navega a Solicitudes con ese ticket filtrado en el buscador.
- Solicitudes: buscar algo sin resultados muestra "Sin coincidencias" + botón que limpia y restaura la lista completa; con la lista realmente vacía (sin filtros) muestra "No hay solicitudes".
- Empleados: mismo comportamiento con "Sin coincidencias"/"No hay empleados".
- Perfil: dejar "Contraseña actual" vacío y enviar muestra "La contraseña actual es requerida".

## Fuera de alcance (recordatorio)

Ver la sección "Alcance" — columnas ordenables, filtros multi-selección, KPI de vencimientos próximos, bug de límite de archivos, y el rediseño de Formularios/Reportes/DatePicker quedan para specs separados.
