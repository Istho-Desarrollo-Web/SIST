# Módulo de Respuestas de Formularios — Design

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Crear un módulo que permite ver las respuestas de un formulario específico, exportarlas a Excel (resumen o detalle) y capturar el nombre de usuarios anónimos al responder.

**Architecture:** Ruta dedicada `/formularios/:id/respuestas` por formulario; dos endpoints nuevos en el backend; captura de identidad previa al formulario para usuarios no autenticados; una migración que agrega `nombreRespondente` a `formulario_respuestas`.

**Tech Stack:** React 19 + Tailwind v4 + exceljs (backend) + Sequelize migration

---

## Acceso y visibilidad

| Rol | Puede ver |
|-----|-----------|
| admin | Todas las respuestas de cualquier formulario |
| tecnico | Todas las respuestas de cualquier formulario |
| usuario | Solo sus propias respuestas |

El backend aplica el filtro: si `req.user.rol === 'usuario'`, agrega `WHERE respondidoPor = req.user.id`.

---

## Cambios al modelo de datos

### Nueva columna: `formulario_respuestas.nombre_respondente`

- Tipo: `VARCHAR(200)`, nullable
- Propósito: almacenar el nombre de usuarios no autenticados
- Requiere migración Sequelize nueva
- Se llena solo cuando `respondidoPor IS NULL` y el usuario provee su nombre en el paso previo

### Lógica de resolución de "Respondido por"

1. Si `respondidoPor` tiene valor → `respondedor.nombre` (JOIN a `usuarios`)
2. Si `nombreRespondente` tiene valor → ese valor
3. Fallback → "Anónimo"

---

## Backend

### Migración

Archivo: `server/src/migrations/YYYYMMDDHHMMSS-add-nombre-respondente-to-formulario-respuestas.js`

```js
await queryInterface.addColumn('formulario_respuestas', 'nombre_respondente', {
  type: Sequelize.STRING(200),
  allowNull: true,
  defaultValue: null,
  after: 'ip_respondente',
});
```

### Modelo actualizado: `FormularioRespuesta.js`

Agregar campo:
```js
nombreRespondente: { type: DataTypes.STRING(200), allowNull: true },
```

### Endpoints nuevos

Ambos van en `formularioRoutes.js` bajo `auth` (no `auth.optional`).

#### `GET /formularios/:id/respuestas`

Parámetros de query:
- `page` (default: 1)
- `limit` (default: 20)
- `desde` (YYYY-MM-DD, opcional)
- `hasta` (YYYY-MM-DD, opcional)
- `buscar` (string, opcional — filtra por nombre respondente o nombre usuario)

Respuesta:
```json
{
  "success": true,
  "data": {
    "respuestas": [
      {
        "id": 1,
        "respondidoPor": 3,
        "nombreRespondente": null,
        "respondedor": { "id": 3, "nombre": "Juan Pérez" },
        "estado": "completado",
        "createdAt": "2026-06-25T10:00:00.000Z",
        "pdf": { "id": 1, "urlCloudinary": "https://..." }
      }
    ],
    "total": 45,
    "page": 1,
    "totalPages": 3
  }
}
```

**No incluye** los `RespuestaCampo` en este endpoint (evita payload gigante).

#### `GET /formularios/:id/respuestas/export?formato=resumen|detalle`

- Genera y devuelve un archivo `.xlsx` con `Content-Disposition: attachment; filename="respuestas-<nombre-formulario>.xlsx"`
- Para `formato=detalle`: carga todos los `FormularioCampo` del formulario + todos los `RespuestaCampo` de las respuestas filtradas
- Aplica la misma regla de visibilidad por rol

#### `GET /formularios/respuestas/:id/detalle`

Devuelve los `RespuestaCampo` de una respuesta específica (para el modal de detalle en el frontend).

```json
{
  "success": true,
  "data": {
    "respuesta": { "id": 1, "estado": "completado", "createdAt": "..." },
    "campos": [
      { "etiqueta": "Placa vehículo", "tipo": "texto_corto", "valor": "ABC-123", "archivoUrl": null },
      { "etiqueta": "Firma conductor", "tipo": "firma", "valor": null, "archivoUrl": "https://..." }
    ]
  }
}
```

### Controlador: `formularioRespuestaController.js`

Nuevas funciones a agregar:
- `listarRespuestasFormulario(req, res, next)` — para el listado paginado
- `exportarRespuestas(req, res, next)` — genera Excel con exceljs
- `obtenerDetalleRespuesta(req, res, next)` — campos de una respuesta

### Excel con exceljs

**Formato resumen** — columnas fijas:

| ID | Respondido por | Fecha | Estado | PDF |
|----|---------------|-------|--------|-----|
| 1  | Juan Pérez    | 25/06/2026 | Completado | hyperlink "Descargar" |

**Formato detalle** — columnas fijas + una columna por campo del formulario:

| ID | Respondido por | Fecha | Estado | [Campo 1] | [Campo 2] | ... | PDF |
|----|---------------|-------|--------|-----------|-----------|-----|-----|

- La columna **PDF** usa hyperlink de Excel: `{ text: 'Descargar', hyperlink: urlCloudinary }` — apunta directo a Cloudinary (el Excel se descarga fuera de sesión)
- Campos tipo `firma` → `{ text: 'Ver firma', hyperlink: archivoUrl }`
- Campos tipo `grilla` → JSON.stringify del valor
- Celda vacía si no hay valor para ese campo en esa respuesta
- Header row con fondo navy y texto blanco (color brand)
- `worksheet.columns` con `width` razonable (20 para texto, 30 para email/nombre)

### Dependencia nueva

```bash
npm install exceljs   # en server/
```

---

## Frontend

### Archivos nuevos

- `client/src/pages/FormularioRespuestasPage.jsx` — página principal del módulo
- `client/src/components/formularios/RespuestaDetalleModal.jsx` — modal de detalle de una respuesta

### Archivos modificados

- `client/src/routes.jsx` — agregar ruta `/formularios/:id/respuestas`
- `client/src/pages/FormulariosHomePage.jsx` — botón "Ver respuestas" en tabla de admin
- `client/src/pages/FormularioResponderPage.jsx` — paso previo de captura de nombre para anónimos
- `client/src/services/formulariosApi.js` — métodos nuevos

### Ruta frontend

```jsx
// En routes.jsx — ProtectedRoute solo verifica isAuthenticated; el backend filtra por rol
<Route path="/formularios/:id/respuestas"
  element={<ProtectedRoute><FormularioRespuestasPage /></ProtectedRoute>}
/>
```

### `FormularioRespuestasPage.jsx`

**Estructura de la página:**

```
[← Volver]  Respuestas: <Nombre del formulario>    [N respuestas]

[Filtros: DatePicker Desde | DatePicker Hasta | Input buscar]
                                [Exportar resumen ↓] [Exportar detalle ↓]

Tabla:
  # | Respondido por | Fecha | Estado | PDF | Acciones
  1 | Juan Pérez     | 25/06 | Badge  | ↓   | [Ver detalle]
  ...

[Paginación]
```

- Componentes reutilizados: `DatePicker`, `Select`, `Badge`, `Skeleton`, `Pagination`, `Modal`
- Al hacer clic en "Ver detalle" se abre `RespuestaDetalleModal` que llama a `GET /formularios/respuestas/:id/detalle`
- Export dispara descarga del `.xlsx` via `api.get(..., { responseType: 'blob' })` + `URL.createObjectURL`
- Botón de export muestra spinner `Loader2` mientras descarga

### `RespuestaDetalleModal.jsx`

Modal que muestra todos los campos y valores de una respuesta:
- Campos normales: etiqueta → valor en texto
- Campos firma: etiqueta → miniatura de imagen (si `archivoUrl` existe)
- Campos grilla: tabla simple parseando el JSON
- Si el estado es 'pendiente', muestra badge de advertencia

### Modificación en `FormularioResponderPage.jsx`

Si `!isAuthenticated`:

```
┌─────────────────────────────────────────┐
│  Antes de continuar                     │
│  ¿Cuál es tu nombre?  [____________]   │
│                        [Continuar →]   │
└─────────────────────────────────────────┘
```

- El nombre se guarda en estado local y se envía como `nombreRespondente` en el body del POST
- Si el usuario está autenticado, este paso no aparece — se salta directamente al formulario
- Solo se muestra para formularios con `acceso: 'publico'`; los formularios `autenticado` ya requieren login (ProtectedRoute)

### `formulariosApi.js` — métodos nuevos

```js
listarRespuestasFormulario: (id, params) =>
  api.get(`/formularios/${id}/respuestas`, { params }),

exportarRespuestas: (id, formato) =>
  api.get(`/formularios/${id}/respuestas/export`, {
    params: { formato },
    responseType: 'blob',
  }),

obtenerDetalleRespuesta: (respuestaId) =>
  api.get(`/formularios/respuestas/${respuestaId}/detalle`),
```

### Punto de entrada: botón "Ver respuestas"

En `FormulariosHomePage.jsx`, en la tabla de administración, agregar un botón junto a "Editar":

```jsx
<button onClick={() => navigate(`/formularios/${f.id}/respuestas`)}>
  <Eye className="w-3.5 h-3.5" />
</button>
```

---

## Reglas de negocio

1. El endpoint de listado y export aplica visibilidad por rol antes de cualquier filtro adicional.
2. `nombreRespondente` solo se guarda si el usuario no está autenticado (`respondidoPor IS NULL`). Si el usuario está autenticado, se ignora aunque venga en el body.
3. El export "detalle" incluye solo campos de tipo visible (excluye campos de secciones con `visibleParaUsuario: false` si el solicitante es `usuario`; admin/tecnico ven todos).
4. La paginación del endpoint devuelve máximo 100 registros por página para evitar payloads excesivos.
5. Los hyperlinks PDF en Excel apuntan directo a `urlCloudinary`. Si el PDF no existe, la celda queda vacía.
