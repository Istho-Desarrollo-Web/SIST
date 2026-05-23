# Diseño: Ciclo de vida de estados del ticket

**Fecha:** 2026-05-23  
**Alcance:** Backend + Frontend + Migración de BD  
**Enfoque elegido:** Migración única (Enfoque A)

---

## Contexto

El documento institucional "Definición de Estados del Ticket" establece un ciclo de vida formal con 8 estados y un diagrama de transiciones estricto. El sistema actual tiene 7 estados (`abierto`, `en_proceso`, `pendiente_usuario`, `pendiente_externo`, `resuelto`, `cerrado`, `cancelado`) con transiciones solo controladas en el frontend y sin validación de servidor.

Cambios requeridos:
1. Agregar estado `en_analisis` (entre `abierto` y `en_proceso`)
2. Reemplazar `cancelado` por `rechazado` (semántica diferente: solicitud fuera del alcance de TI, requiere motivo obligatorio)
3. Validación de transiciones en el servidor
4. Motivo obligatorio al rechazar

---

## Base de datos

**Migración:** `20260523000012-update-estados-solicitudes.js`

```sql
-- Paso 1: ampliar el ENUM para aceptar los nuevos valores
ALTER TABLE solicitudes
  MODIFY COLUMN estado ENUM(
    'abierto','en_analisis','en_proceso',
    'pendiente_usuario','pendiente_externo',
    'resuelto','cerrado','cancelado','rechazado'
  ) NOT NULL DEFAULT 'abierto';

-- Paso 2: migrar datos existentes
UPDATE solicitudes SET estado = 'rechazado' WHERE estado = 'cancelado';

-- Paso 3: limpiar el ENUM
ALTER TABLE solicitudes
  MODIFY COLUMN estado ENUM(
    'abierto','en_analisis','en_proceso',
    'pendiente_usuario','pendiente_externo',
    'resuelto','cerrado','rechazado'
  ) NOT NULL DEFAULT 'abierto';
```

**Rollback (`down`):**
1. Agregar `cancelado` de vuelta al ENUM
2. `UPDATE` registros `rechazado` → `cancelado`
3. Quitar `en_analisis` y `rechazado` del ENUM

---

## Backend

### `server/src/utils/constants.js`

Reemplazar `CANCELADO` por `EN_ANALISIS` y `RECHAZADO`:

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

### `server/src/models/Solicitud.js`

Actualizar el ENUM del campo `estado` con los 8 valores nuevos (sin `cancelado`).

### `server/src/controllers/solicitudController.js`

#### Matriz de transiciones (nueva constante de módulo)

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

#### `cambiarEstado()`

- Validar que `estadoNuevo` esté en `TRANSICIONES_VALIDAS[estadoActual]`. Si no → `400 { message: 'Transición no permitida: <anterior> → <nuevo>' }`.
- Si `estadoNuevo === 'rechazado'` y `comentarioNotificacion` está vacío o ausente → `400 { message: 'El motivo de rechazo es obligatorio' }`.
- Actualizar `fechaPrimeraRespuesta` cuando `estadoNuevo === 'en_analisis'` (primer contacto del técnico) en lugar de `en_proceso`.
- Mantener el registro de `fechaResolucion` y `tiempoResolucionMinutos` para `resuelto` y `cerrado`.

#### `asignarTecnico()`

Al asignar técnico desde estado `abierto`, el estado pasa automáticamente a `en_analisis` (antes era `en_proceso`). Aplica tanto en asignación individual como en acción masiva.

#### `accionMasiva()`

- Actualizar `ESTADOS_VALIDOS` para incluir `en_analisis` y `rechazado`, excluir `cancelado`.
- Aplicar la misma validación de transición por cada solicitud del lote. Las solicitudes donde la transición no sea válida se saltan (se acumulan en un array `omitidas`) y se devuelven en la respuesta.

### `server/src/services/emailService.js`

Actualizar `ESTADO_LABEL`:
```js
const ESTADO_LABEL = {
  abierto: 'Abierto', en_analisis: 'En Análisis', en_proceso: 'En proceso',
  pendiente_usuario: 'Pendiente usuario', pendiente_externo: 'Pendiente externo',
  resuelto: 'Resuelto', cerrado: 'Cerrado', rechazado: 'Rechazado',
};
```

---

## Frontend

### `client/src/utils/constants.js`

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

### `client/src/components/solicitudes/SolicitudModal.jsx`

#### `estadosSiguientes` actualizado

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

#### Modal de motivo para `rechazado`

Al hacer clic en "Rechazado", antes de llamar al API se muestra un modal/dialog con:
- Textarea: "Motivo del rechazo" (obligatorio)
- Botón "Confirmar rechazo" (deshabilitado mientras el textarea esté vacío)
- Botón "Cancelar"

El motivo se envía como `comentarioNotificacion` en el body del `PATCH /solicitudes/:id/estado`.

### Filtros de estado

En todas las páginas que tengan `<Select>` de filtro por estado (principalmente `SolicitudesPage`): reemplazar `cancelado` por `en_analisis` y `rechazado` en las opciones.

---

## Flujo de transiciones (resumen)

```
ABIERTO → EN ANÁLISIS (único camino; asignar técnico también lleva aquí)
EN ANÁLISIS → EN PROCESO | PENDIENTE USUARIO | PENDIENTE EXTERNO | RECHAZADO*
EN PROCESO → RESUELTO | PENDIENTE USUARIO | PENDIENTE EXTERNO
PENDIENTE USUARIO → EN PROCESO | CERRADO
PENDIENTE EXTERNO → EN PROCESO
RESUELTO → CERRADO | EN PROCESO
CERRADO → (final)
RECHAZADO → (final) *motivo obligatorio
```

---

## Consideraciones de compatibilidad

- Tickets existentes con estado `cancelado` en producción migran a `rechazado` mediante el `UPDATE` de la migración.
- El campo `comentarioNotificacion` ya existe en el payload del endpoint — no se agrega columna nueva, solo se valida su presencia cuando `estado === 'rechazado'`.
- La notificación de correo `notificarCambioEstado` funciona sin cambios adicionales para los nuevos estados.
