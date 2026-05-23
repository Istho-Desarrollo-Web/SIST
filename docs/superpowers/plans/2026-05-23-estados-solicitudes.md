# Estados del Ticket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el ciclo de vida formal del ticket: agregar estado `en_analisis`, reemplazar `cancelado` por `rechazado` (con motivo obligatorio), y aplicar validación de transiciones en servidor y cliente.

**Architecture:** Migración MySQL que amplía el ENUM y migra datos existentes en 3 pasos atómicos. El backend aplica una matriz de transiciones válidas en `cambiarEstado` y `bulkAction`. El frontend reemplaza la lógica de botones y agrega un mini-modal de motivo para el rechazo.

**Tech Stack:** Sequelize 6 migrations (MySQL ENUM alter), Express 5 controllers, React 19 + Tailwind v4

---

## Mapa de archivos

| Archivo | Acción |
|---|---|
| `server/src/migrations/20260523000012-update-estados-solicitudes.js` | Crear |
| `server/src/utils/constants.js` | Modificar |
| `server/src/models/Solicitud.js` | Modificar |
| `server/src/controllers/solicitudController.js` | Modificar |
| `server/src/services/emailService.js` | Modificar |
| `client/src/utils/constants.js` | Modificar |
| `client/src/services/solicitudService.js` | Modificar |
| `client/src/components/solicitudes/SolicitudModal.jsx` | Modificar |
| `client/src/pages/SolicitudesPage.jsx` | Modificar |

---

### Task 1: Migración de base de datos

**Files:**
- Create: `soporte-ti-istho/server/src/migrations/20260523000012-update-estados-solicitudes.js`

- [ ] **Step 1: Crear archivo de migración**

Crear `soporte-ti-istho/server/src/migrations/20260523000012-update-estados-solicitudes.js` con el siguiente contenido:

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Paso 1: ampliar ENUM para aceptar los nuevos valores sin romper datos existentes
    await queryInterface.changeColumn('solicitudes', 'estado', {
      type: Sequelize.ENUM(
        'abierto', 'en_analisis', 'en_proceso',
        'pendiente_usuario', 'pendiente_externo',
        'resuelto', 'cerrado', 'cancelado', 'rechazado'
      ),
      allowNull: false,
      defaultValue: 'abierto',
    });

    // Paso 2: migrar datos — cancelado → rechazado
    await queryInterface.sequelize.query(
      "UPDATE solicitudes SET estado = 'rechazado' WHERE estado = 'cancelado'"
    );

    // Paso 3: limpiar ENUM — quitar cancelado
    await queryInterface.changeColumn('solicitudes', 'estado', {
      type: Sequelize.ENUM(
        'abierto', 'en_analisis', 'en_proceso',
        'pendiente_usuario', 'pendiente_externo',
        'resuelto', 'cerrado', 'rechazado'
      ),
      allowNull: false,
      defaultValue: 'abierto',
    });
  },

  async down(queryInterface, Sequelize) {
    // Paso 1: agregar cancelado de vuelta
    await queryInterface.changeColumn('solicitudes', 'estado', {
      type: Sequelize.ENUM(
        'abierto', 'en_analisis', 'en_proceso',
        'pendiente_usuario', 'pendiente_externo',
        'resuelto', 'cerrado', 'cancelado', 'rechazado'
      ),
      allowNull: false,
      defaultValue: 'abierto',
    });

    // Paso 2: revertir datos — rechazado → cancelado
    await queryInterface.sequelize.query(
      "UPDATE solicitudes SET estado = 'cancelado' WHERE estado = 'rechazado'"
    );

    // Paso 3: limpiar ENUM — quitar en_analisis y rechazado
    await queryInterface.changeColumn('solicitudes', 'estado', {
      type: Sequelize.ENUM(
        'abierto', 'en_proceso',
        'pendiente_usuario', 'pendiente_externo',
        'resuelto', 'cerrado', 'cancelado'
      ),
      allowNull: false,
      defaultValue: 'abierto',
    });
  },
};
```

- [ ] **Step 2: Ejecutar migración localmente**

```bash
cd soporte-ti-istho/server
npx sequelize-cli db:migrate
```

Salida esperada:
```
== 20260523000012-update-estados-solicitudes: migrating =======
== 20260523000012-update-estados-solicitudes: migrated (X.XXXs)
```

Si hay error `Cannot add or update a child row`, significa que hay registros en otras tablas que referencian `solicitudes` — no aplica aquí ya que `estado` no es FK.

- [ ] **Step 3: Verificar en BD**

```bash
npx sequelize-cli db:migrate:status
```

Debe aparecer `up` para `20260523000012-update-estados-solicitudes`.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/server/src/migrations/20260523000012-update-estados-solicitudes.js
git commit -m "feat: migración BD — agregar en_analisis, reemplazar cancelado por rechazado"
```

---

### Task 2: Backend — constantes y modelo

**Files:**
- Modify: `soporte-ti-istho/server/src/utils/constants.js`
- Modify: `soporte-ti-istho/server/src/models/Solicitud.js`

- [ ] **Step 1: Actualizar `server/src/utils/constants.js`**

Reemplazar el bloque `ESTADOS` completo:

```js
const ESTADOS = {
  ABIERTO:           'abierto',
  EN_ANALISIS:       'en_analisis',
  EN_PROCESO:        'en_proceso',
  PENDIENTE_USUARIO: 'pendiente_usuario',
  PENDIENTE_EXTERNO: 'pendiente_externo',
  RESUELTO:          'resuelto',
  CERRADO:           'cerrado',
  RECHAZADO:         'rechazado',
};
```

El resto del archivo (`PRIORIDADES`, `TIPOS_SOLICITUD`, `SLA_CONFIG`, etc.) no cambia.

- [ ] **Step 2: Actualizar `server/src/models/Solicitud.js`**

Reemplazar la definición del campo `estado`:

```js
estado: {
  type: DataTypes.ENUM(
    'abierto', 'en_analisis', 'en_proceso',
    'pendiente_usuario', 'pendiente_externo',
    'resuelto', 'cerrado', 'rechazado'
  ),
  allowNull: false,
  defaultValue: 'abierto',
},
```

- [ ] **Step 3: Verificar que el servidor arranca sin error**

```bash
cd soporte-ti-istho/server
npm run dev
```

Salida esperada: `Server running on port 5000` sin errores de Sequelize sobre valores ENUM desconocidos.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/server/src/utils/constants.js soporte-ti-istho/server/src/models/Solicitud.js
git commit -m "feat: actualizar constantes y modelo — nuevos estados en_analisis y rechazado"
```

---

### Task 3: Backend — validación de transiciones en controller

**Files:**
- Modify: `soporte-ti-istho/server/src/controllers/solicitudController.js`

- [ ] **Step 1: Agregar matriz de transiciones al inicio del módulo**

Después de la línea `const { ROLES } = require('../utils/constants');` (línea 7), agregar:

```js
const TRANSICIONES_VALIDAS = {
  abierto:           ['en_analisis'],
  en_analisis:       ['en_proceso', 'pendiente_usuario', 'pendiente_externo', 'rechazado'],
  en_proceso:        ['resuelto', 'pendiente_usuario', 'pendiente_externo'],
  pendiente_usuario: ['en_proceso', 'cerrado'],
  pendiente_externo: ['en_proceso'],
  resuelto:          ['cerrado', 'en_proceso'],
  cerrado:           [],
  rechazado:         [],
};
```

- [ ] **Step 2: Actualizar función `cambiarEstado`**

Reemplazar la función `cambiarEstado` completa (líneas 168–206):

```js
async function cambiarEstado(req, res, next) {
  try {
    const { estado, comentarioNotificacion } = req.body;
    const sol = await Solicitud.findByPk(req.params.id);
    if (!sol) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    const anterior = sol.estado;
    const transicionesPermitidas = TRANSICIONES_VALIDAS[anterior] || [];
    if (!transicionesPermitidas.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Transición no permitida: ${anterior} → ${estado}`,
      });
    }

    if (estado === 'rechazado' && !comentarioNotificacion?.trim()) {
      return res.status(400).json({ success: false, message: 'El motivo de rechazo es obligatorio' });
    }

    const updates = { estado };

    if (estado === 'en_analisis' && !sol.fechaPrimeraRespuesta) {
      updates.fechaPrimeraRespuesta = new Date();
    }
    if (estado === 'resuelto' || estado === 'cerrado') {
      updates.fechaResolucion = new Date();
      updates.tiempoResolucionMinutos = Math.round((new Date() - new Date(sol.fechaCreacion)) / 60000);
      updates.porcentajeSLA = calcularPorcentajeSLA(sol.fechaCreacion, sol.fechaLimiteResolucion, new Date());
    }

    await sol.update(updates);

    await registrarAuditoria({
      tabla: 'solicitudes', registro_id: sol.id, operacion: 'UPDATE',
      datos_anteriores: { estado: anterior }, datos_nuevos: { estado },
      campo_modificado: 'estado', usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    const empleado = await Empleado.findByPk(sol.empleado_id);
    notificarCambioEstado(sol, empleado, anterior, estado, comentarioNotificacion || null)
      .catch((e) => console.error('[email] notificarCambioEstado:', e.message));

    const solActualizada = await Solicitud.findByPk(sol.id, {
      include: [
        { model: Empleado, as: 'empleado' },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'especialidad', 'email'] },
      ],
    });
    res.json({ success: true, data: solActualizada, message: 'Estado actualizado' });
  } catch (err) { next(err); }
}
```

- [ ] **Step 3: Actualizar `asignarTecnico`**

En la función `asignarTecnico` (línea 215), reemplazar la línea de `sol.update`:

```js
// Antes:
await sol.update({ tecnicoAsignado: tecnicoId, estado: sol.estado === 'abierto' ? 'en_proceso' : sol.estado });

// Después:
await sol.update({ tecnicoAsignado: tecnicoId, estado: sol.estado === 'abierto' ? 'en_analisis' : sol.estado });
```

- [ ] **Step 4: Actualizar `bulkAction`**

En la función `bulkAction`, hacer los siguientes tres cambios:

**4a. Actualizar `ESTADOS_VALIDOS` (línea 292):**
```js
const ESTADOS_VALIDOS = [
  'abierto', 'en_analisis', 'en_proceso',
  'pendiente_usuario', 'pendiente_externo',
  'resuelto', 'cerrado', 'rechazado',
];
```

**4b. Agregar validación: rechazado no permitido en bulk (después de la validación `ESTADOS_VALIDOS`):**
```js
if (accion === 'cambiar_estado' && valor === 'rechazado') {
  return res.status(400).json({ success: false, message: 'El rechazo individual requiere motivo. Usa la acción individual para rechazar.' });
}
```

**4c. En el loop interno, reemplazar el bloque `if (accion === 'cambiar_estado')` para aplicar transiciones y registrar omitidas:**

Antes del `await sequelize.transaction(...)`, agregar declaración:
```js
const omitidas = [];
```

Dentro del loop, reemplazar el bloque de `cambiar_estado`:
```js
if (accion === 'cambiar_estado') {
  const permitidas = TRANSICIONES_VALIDAS[sol.estado] || [];
  if (!permitidas.includes(valor)) {
    omitidas.push({ id: sol.id, numero: sol.numero, motivo: `Transición no permitida: ${sol.estado} → ${valor}` });
    continue;
  }
  updates.estado = valor;
  if (valor === 'en_analisis' && !sol.fechaPrimeraRespuesta) {
    updates.fechaPrimeraRespuesta = ahora;
  }
  if (valor === 'resuelto' || valor === 'cerrado') {
    updates.fechaResolucion = ahora;
    updates.tiempoResolucionMinutos = Math.round((ahora - new Date(sol.fechaCreacion)) / 60000);
    if (sol.fechaLimiteResolucion) {
      updates.porcentajeSLA = calcularPorcentajeSLA(sol.fechaCreacion, sol.fechaLimiteResolucion, ahora);
    }
  }
```

También actualizar el bloque `asignar_tecnico` dentro del loop:
```js
} else if (accion === 'asignar_tecnico') {
  updates.tecnicoAsignado = tecnicoId;
  if (sol.estado === 'abierto') updates.estado = 'en_analisis';
}
```

**4d. Actualizar la respuesta final para incluir `omitidas`:**
```js
res.json({
  success: true,
  message: `${actualizadas} solicitud${actualizadas !== 1 ? 'es' : ''} actualizada${actualizadas !== 1 ? 's' : ''}`,
  data: { actualizadas, total: ids.length, omitidas },
});
```

- [ ] **Step 5: Verificar con curl que la validación funciona**

Con el servidor corriendo, crear una solicitud en estado `abierto` e intentar pasar directo a `resuelto`:

```bash
# Ajustar el ID y el token según entorno local
curl -X PUT http://localhost:5000/api/solicitudes/1/estado \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"estado":"resuelto"}'
```

Respuesta esperada:
```json
{"success":false,"message":"Transición no permitida: abierto → resuelto"}
```

- [ ] **Step 6: Commit**

```bash
git add soporte-ti-istho/server/src/controllers/solicitudController.js
git commit -m "feat: validación de transiciones en servidor, motivo obligatorio para rechazado"
```

---

### Task 4: Backend — emailService

**Files:**
- Modify: `soporte-ti-istho/server/src/services/emailService.js`

- [ ] **Step 1: Actualizar `ESTADO_LABEL`**

Reemplazar el objeto `ESTADO_LABEL` (línea 24):

```js
const ESTADO_LABEL = {
  abierto:           'Abierto',
  en_analisis:       'En Análisis',
  en_proceso:        'En proceso',
  pendiente_usuario: 'Pendiente usuario',
  pendiente_externo: 'Pendiente externo',
  resuelto:          'Resuelto',
  cerrado:           'Cerrado',
  rechazado:         'Rechazado',
};
```

- [ ] **Step 2: Commit**

```bash
git add soporte-ti-istho/server/src/services/emailService.js
git commit -m "feat: agregar en_analisis y rechazado a labels de email"
```

---

### Task 5: Frontend — constantes

**Files:**
- Modify: `soporte-ti-istho/client/src/utils/constants.js`

- [ ] **Step 1: Actualizar `ESTADOS_LABEL` y `ESTADO_COLORS`**

Reemplazar los dos objetos completos:

```js
export const ESTADOS_LABEL = {
  abierto:           'Abierto',
  en_analisis:       'En Análisis',
  en_proceso:        'En Proceso',
  pendiente_usuario: 'Pendiente Usuario',
  pendiente_externo: 'Pendiente Externo',
  resuelto:          'Resuelto',
  cerrado:           'Cerrado',
  rechazado:         'Rechazado',
};

export const ESTADO_COLORS = {
  abierto:           'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_analisis:       'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  en_proceso:        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  pendiente_usuario: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  pendiente_externo: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  resuelto:          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cerrado:           'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  rechazado:         'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
```

- [ ] **Step 2: Commit**

```bash
git add soporte-ti-istho/client/src/utils/constants.js
git commit -m "feat: constantes frontend — en_analisis y rechazado en labels y colores"
```

---

### Task 6: Frontend — SolicitudModal (transiciones + modal de rechazo)

**Files:**
- Modify: `soporte-ti-istho/client/src/services/solicitudService.js`
- Modify: `soporte-ti-istho/client/src/components/solicitudes/SolicitudModal.jsx`

- [ ] **Step 1: Actualizar `solicitudService.cambiarEstado`**

En `soporte-ti-istho/client/src/services/solicitudService.js`, reemplazar la línea de `cambiarEstado`:

```js
cambiarEstado: (id, estado, comentarioNotificacion) =>
  api.put(`/solicitudes/${id}/estado`, {
    estado,
    ...(comentarioNotificacion ? { comentarioNotificacion } : {}),
  }),
```

- [ ] **Step 2: Actualizar `estadosSiguientes` en `SolicitudModal.jsx`**

Reemplazar el objeto `estadosSiguientes` (líneas 102–110):

```js
const estadosSiguientes = {
  abierto:           ['en_analisis'],
  en_analisis:       ['en_proceso', 'pendiente_usuario', 'pendiente_externo', 'rechazado'],
  en_proceso:        ['resuelto', 'pendiente_usuario', 'pendiente_externo'],
  pendiente_usuario: ['en_proceso', 'cerrado'],
  pendiente_externo: ['en_proceso'],
  resuelto:          ['cerrado', 'en_proceso'],
  cerrado:           [],
  rechazado:         [],
};
```

- [ ] **Step 3: Agregar state para modal de rechazo**

En el bloque de `useState` al inicio del componente, después de `const [saving, setSaving] = useState(false);` (línea 21), agregar:

```js
const [showMotivoRechazo, setShowMotivoRechazo] = useState(false);
const [motivoRechazo, setMotivoRechazo] = useState('');
```

- [ ] **Step 4: Actualizar función `cambiarEstado` del componente**

Reemplazar la función `cambiarEstado` (líneas 59–67):

```js
const cambiarEstado = async (estado, motivo) => {
  setSaving(true);
  try {
    const res = await solicitudService.cambiarEstado(sol.id, estado, motivo);
    setSol(res.data.data);
    toast.success('Estado actualizado');
  } catch (err) {
    const msg = err.response?.data?.message || 'Error al cambiar estado';
    toast.error(msg);
  } finally { setSaving(false); }
};

const handleEstadoClick = (estado) => {
  if (estado === 'rechazado') {
    setMotivoRechazo('');
    setShowMotivoRechazo(true);
  } else {
    cambiarEstado(estado);
  }
};

const confirmarRechazo = async () => {
  if (!motivoRechazo.trim()) return;
  await cambiarEstado('rechazado', motivoRechazo.trim());
  setShowMotivoRechazo(false);
  setMotivoRechazo('');
};
```

- [ ] **Step 5: Actualizar botones de cambio de estado**

En la sección de cambio de estado (líneas 186–194), reemplazar `onClick={() => cambiarEstado(e)}` por `onClick={() => handleEstadoClick(e)}`:

```jsx
{estadosSiguientes[sol.estado].map(e => (
  <Button key={e} variant="outline" size="sm" loading={saving} onClick={() => handleEstadoClick(e)}>
    <RefreshCw size={12} />
    {ESTADOS_LABEL[e]}
  </Button>
))}
```

- [ ] **Step 6: Agregar modal de motivo de rechazo**

Antes del `<div className="flex justify-end pt-2">` de cierre (línea 351), agregar:

```jsx
{/* Modal de motivo de rechazo */}
{showMotivoRechazo && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
      <h3 className="text-base font-semibold text-navy-500 dark:text-white mb-1">Rechazar solicitud</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Documenta obligatoriamente el motivo del rechazo.
      </p>
      <textarea
        value={motivoRechazo}
        onChange={e => setMotivoRechazo(e.target.value)}
        rows={3}
        placeholder="Motivo del rechazo..."
        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none mb-4"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setShowMotivoRechazo(false)}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={saving}
          disabled={!motivoRechazo.trim()}
          onClick={confirmarRechazo}
          className="bg-red-600 hover:bg-red-700"
        >
          Confirmar rechazo
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 7: Verificar en el navegador**

Abrir una solicitud en estado `abierto`. Verificar que el único botón visible sea "En Análisis". Hacer clic en "En Análisis" — el estado debe cambiar correctamente. Abrir una solicitud en `en_analisis` y hacer clic en "Rechazado" — debe aparecer el modal. Sin texto el botón "Confirmar" debe estar deshabilitado.

- [ ] **Step 8: Commit**

```bash
git add soporte-ti-istho/client/src/services/solicitudService.js soporte-ti-istho/client/src/components/solicitudes/SolicitudModal.jsx
git commit -m "feat: SolicitudModal — nuevas transiciones y modal de motivo para rechazado"
```

---

### Task 7: Frontend — SolicitudesPage (filtros y bulk)

**Files:**
- Modify: `soporte-ti-istho/client/src/pages/SolicitudesPage.jsx`

- [ ] **Step 1: Actualizar `ESTADOS_BULK`**

Al inicio de `SolicitudesPage.jsx` (líneas 20–23), reemplazar el array `ESTADOS_BULK`:

```js
const ESTADOS_BULK = [
  'abierto', 'en_analisis', 'en_proceso',
  'pendiente_usuario', 'pendiente_externo',
  'resuelto', 'cerrado',
];
```

Nota: `rechazado` no está incluido en bulk (requiere motivo individual).

- [ ] **Step 2: Verificar el filtro de estado**

El filtro `<Select>` de estado en `SolicitudesPage` usa `Object.entries(ESTADOS_LABEL)` (línea 150), por lo que ya refleja automáticamente los cambios de la Task 5. No requiere cambio adicional.

- [ ] **Step 3: Verificar en el navegador**

Abrir la página de solicitudes. Verificar que el filtro de estado muestra "En Análisis" y "Rechazado" en las opciones, y ya no aparece "Cancelado". Verificar que la acción masiva "Cambiar estado" no incluye "Rechazado".

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/client/src/pages/SolicitudesPage.jsx
git commit -m "feat: SolicitudesPage — actualizar ESTADOS_BULK y filtros para nuevos estados"
```

---

### Task 8: Push final

- [ ] **Step 1: Push a origin**

```bash
git push origin main
```

El `prestart` en el server ejecutará `npx sequelize-cli db:migrate` automáticamente en Render al hacer deploy.

- [ ] **Step 2: Verificar en producción**

Tras el deploy en Render, abrir la app en producción y confirmar:
1. No aparece ningún ticket con estado "Cancelado" (todos migrados a "Rechazado")
2. La badge de "En Análisis" aparece en color cyan
3. Al asignar técnico desde una solicitud `abierta`, el estado cambia a "En Análisis"
4. El flujo completo `abierto → en_analisis → en_proceso → resuelto → cerrado` funciona
