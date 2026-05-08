# Spec: 9 Mejoras SIST — Soporte TI ISTHO

**Fecha:** 2026-05-08  
**Proyecto:** soporte-ti-istho  
**Autor:** Osman Gallego

---

## Alcance

Nueve mejoras sobre el sistema existente: correcciones de UI responsiva, nuevas funcionalidades en Dashboard y Reportes, y hardening de robustez/rendimiento. No se modifican modelos de base de datos excepto lo indicado explícitamente.

---

## Ítem 1 — Overflow horizontal

**Problema:** Contenido desborda horizontalmente en pantallas pequeñas en varias páginas.

**Solución:** Envolver todas las tablas y contenedores de datos en `overflow-x-auto`. Archivos afectados: `SolicitudesPage.jsx`, `EmpleadosPage.jsx`, `UsuariosPage.jsx`, `ReportesPage.jsx`.

**Criterio de aceptación:** En viewport de 375px ningún elemento genera scroll horizontal involuntario.

---

## Ítem 2 — InvalidNodeTypeError en consola

**Diagnóstico:** El error `Failed to execute 'selectNode' on 'Range': the given Node has no parent` es generado por una extensión del navegador, no por el código de la aplicación. El `Unchecked runtime.lastError` también es de extensión.

**Solución:** No requiere cambio de código. Se documenta en CLAUDE.md como ruido conocido de extensiones.

---

## Ítem 3 — Paginación en Actividad Reciente (Dashboard)

**Tamaño de página:** 10 ítems.

**Backend (`dashboardController.js` → `actividadReciente`):**
- Aceptar query params `?page=1&limit=10`.
- Respuesta: `{ data: [...], total: N, page: N, totalPages: N }`.
- Default: `page=1`, `limit=10`.

**Frontend (`DashboardPage.jsx`):**
- Agregar estado `const [page, setPage] = useState(1)`.
- Pasar `page` al llamado de la API y re-fetch en cada cambio.
- Renderizar componente `<Pagination>` existente debajo del feed de actividad.

---

## Ítem 4 — Menú de notificaciones (Opción C)

**Diseño aprobado:** Panel flotante con botones compactos ✓/✕ a la derecha de cada ítem y barra de acciones globales fija al pie del panel.

**Fix mobile clipping:**
- Cambiar `w-80` → `w-80 max-w-[calc(100vw-1rem)]`.
- Ajustar posición con `right-0` asegurando que el panel no salga del viewport.

**Acciones por ítem:**
- ✓ Marcar como leído: aplica clase de opacidad reducida, no desaparece.
- ✕ Borrar: elimina el ítem del array de estado.

**Acciones globales (pie del panel):**
- "Marcar todas leídas": itera y marca todas.
- "Borrar todas": vacía el array.

**Alcance:** Solo estado React (`useState`). Sin cambios en base de datos ni nuevo endpoint. Las notificaciones se recargan desde el API al montar el componente (comportamiento actual).

---

## Ítem 5 — Skeleton de carga + scroll innecesario

**Skeleton:**
- Crear variante `SkeletonCard` en `Skeleton.jsx` que imite la tarjeta móvil: rect ancho para título + dos líneas de texto más delgadas.
- En `SolicitudesPage.jsx`: renderizar ambos skeletons y alternarlos con Tailwind (`block sm:hidden` para card, `hidden sm:block` para table). No usar `window.innerWidth`.

**Scroll innecesario:**
- Identificar y eliminar `min-h`, `overflow-y: scroll` o padding/margin excesivo que genera espacio blanco en la vista de lista de solicitudes.

---

## Ítem 6 — Campo fecha recortado en móvil (ReportesPage)

**Solución:**
- Asegurar `w-full` en el input de fecha y en su contenedor padre.
- Agregar `min-w-0` en el flex-item que contiene el campo para evitar que flex ignore el `w-full`.
- Verificar que no haya `overflow: hidden` sin ancho definido en ancestros.

---

## Ítem 7 — Hora en columnas de fecha

**Columnas afectadas:**
- "Fecha creación" en `SolicitudesPage.jsx` (tabla + tarjeta móvil).
- "Fecha resolución" en `SolicitudesPage.jsx` y `SolicitudModal.jsx`.
- Hoja Excel generada en el reporte (función de exportación en `ReportesPage.jsx`).

**Cambio:** Reemplazar `formatFechaCorta` → `formatFecha` en todos los puntos anteriores. `formatFecha` ya incluye hora (`dd/MM/yyyy HH:mm`).

---

## Ítem 8 — Nuevas secciones en Reportes (Opción C)

### Sección A — Tipos de solicitud más frecuentes
- **Visualización:** `PieChart` donut de Recharts con leyenda de colores.
- **Datos:** Ya disponibles en `porTipo` del endpoint `/api/reportes/resumen`. No requiere cambio de backend.
- **Labels:** Usar `TIPOS_SOLICITUD_LABEL` de `constants.js`.
- **Colores:** Paleta definida en el componente (naranja, navy, verde, grises).

### Sección B — Empleados con más solicitudes
- **Visualización:** Tabla con columnas: Empleado / Solicitudes / %.
- **Backend:** Extender `reportesController.js` → función `resumen`: agregar consulta `GROUP BY s.empleado_id` con `JOIN empleados` para obtener nombre + conteo. Ordenar DESC, `LIMIT 10`.
- **Nuevo campo en respuesta:** `topEmpleados: [{ nombre, total, porcentaje }]`.
- **Frontend:** Tabla simple en `ReportesPage.jsx`, sin gráfico adicional.

---

## Ítem 9 — Robustez, rendimiento y responsivo

### Protección doble clic
- En todos los botones que disparan un request (`SolicitudForm`, `EmpleadoModal`, `UsuarioModal`, `LoginPage`, acciones bulk en `SolicitudesPage`):
  - Agregar estado local `const [submitting, setSubmitting] = useState(false)`.
  - Deshabilitar el botón mientras `submitting === true`.
  - Usar `try/finally` para garantizar que `submitting` vuelva a `false` incluso si falla.

### Animaciones suaves
- Agregar `transition-all duration-200` a: apertura/cierre de modales, menús desplegables (notificaciones, usuario), y sidebar móvil.

### Responsivo adicional
- Verificar que todos los modales tengan `max-h-[90vh] overflow-y-auto` para no quedar cortados en pantallas bajas.
- Asegurar que los filtros de `SolicitudesPage` hagan wrap correctamente en móvil (`flex-wrap`).

### Backend
- Verificar que los endpoints de mutación (POST/PUT/DELETE) tengan reglas de `express-validator` definidas.
- Agregar `process.on('unhandledRejection')` en `server.js` si no existe, para que las promesas rechazadas no cierren el proceso silenciosamente.

---

## Archivos impactados (resumen)

| Archivo | Ítems |
|---------|-------|
| `server/src/controllers/dashboardController.js` | 3 |
| `server/src/controllers/reportesController.js` | 8B |
| `client/src/pages/DashboardPage.jsx` | 3 |
| `client/src/pages/SolicitudesPage.jsx` | 1, 5, 7, 9 |
| `client/src/pages/ReportesPage.jsx` | 1, 6, 7, 8A, 8B |
| `client/src/pages/EmpleadosPage.jsx` | 1 |
| `client/src/pages/UsuariosPage.jsx` | 1 |
| `client/src/pages/LoginPage.jsx` | 9 |
| `client/src/components/layout/Navbar.jsx` | 4 |
| `client/src/components/common/Skeleton.jsx` | 5 |
| `client/src/components/solicitudes/SolicitudModal.jsx` | 7, 9 |
| `client/src/components/empleados/EmpleadoModal.jsx` | 9 |
| `client/src/components/usuarios/UsuarioModal.jsx` | 9 |
| `soporte-ti-istho/CLAUDE.md` | 2 |

---

## Fuera de alcance

- Persistencia de notificaciones en base de datos.
- Sistema de notificaciones push en tiempo real (WebSocket).
- Internacionalización (i18n).
- Cambios en migraciones de Sequelize.
