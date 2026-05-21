# Spec: Módulo de Formularios con Generación de PDF — SIST

**Fecha:** 2026-05-21
**Proyecto:** soporte-ti-istho
**Autor:** Osman Gallego

---

## Alcance

Nuevo módulo **Formularios** que permite a admins y técnicos crear formularios con campos personalizados (incluyendo firma digital), subir un PDF plantilla, y mapear campos del formulario al PDF mediante drag & drop. Al enviar el formulario, el sistema genera el PDF con los datos rellenados y lo almacena. Los empleados disponen de una vista pública con tarjetas de formularios disponibles. Las respuestas pueden asociarse opcionalmente a una solicitud de soporte existente.

No se modifican tablas existentes excepto lo indicado. No se agrega react-pdf (queda para una iteración futura).

---

## Roles y acceso

| Acción | admin | tecnico | usuario (empleado) | público (sin auth) |
|--------|-------|---------|--------------------|--------------------|
| Crear/editar formularios | ✓ | ✓ | — | — |
| Ver lista de formularios propios | ✓ | ✓ | — | — |
| Ver tarjetas de formularios disponibles | ✓ | ✓ | ✓ | (solo formularios públicos) |
| Responder formulario público | — | — | — | ✓ |
| Responder formulario autenticado | ✓ | ✓ | ✓ | — |
| Ver historial de PDFs generados (todos) | ✓ | ✓ | — | — |
| Ver mis propios PDFs generados | ✓ | ✓ | ✓ | — |
| Descargar PDF generado | ✓ | ✓ | ✓ (solo propios) | — |

---

## Modelo de datos

### Tabla `formularios`
```sql
id            INT PK AUTO_INCREMENT
nombre        VARCHAR(200) NOT NULL
descripcion   TEXT
acceso        ENUM('publico','autenticado') NOT NULL DEFAULT 'autenticado'
activo        BOOLEAN NOT NULL DEFAULT true
creado_por    INT NOT NULL → usuarios.id
createdAt     DATETIME
updatedAt     DATETIME
```

### Tabla `formulario_campos`
```sql
id            INT PK AUTO_INCREMENT
formulario_id INT NOT NULL → formularios.id (CASCADE DELETE)
tipo          ENUM('texto_corto','texto_largo','numero','fecha',
                   'seleccion_unica','seleccion_multiple','archivo','firma')
etiqueta      VARCHAR(200) NOT NULL
descripcion   TEXT
placeholder   VARCHAR(200)
requerido     BOOLEAN NOT NULL DEFAULT false
orden         INT NOT NULL DEFAULT 0
opciones      JSON   -- solo para seleccion_unica y seleccion_multiple
               -- formato: ["Opción A", "Opción B", ...]
createdAt     DATETIME
updatedAt     DATETIME
```

### Tabla `formulario_pdf_plantillas`
```sql
id            INT PK AUTO_INCREMENT
formulario_id INT NOT NULL → formularios.id (CASCADE DELETE)
nombre        VARCHAR(200) NOT NULL
url_cloudinary VARCHAR(500) NOT NULL
public_id     VARCHAR(300) NOT NULL
tiene_acroform BOOLEAN NOT NULL DEFAULT false
createdAt     DATETIME
updatedAt     DATETIME
```
Un formulario tiene como máximo una plantilla PDF activa (la última subida reemplaza a la anterior).

### Tabla `formulario_pdf_mapeos`
```sql
id              INT PK AUTO_INCREMENT
plantilla_id    INT NOT NULL → formulario_pdf_plantillas.id (CASCADE DELETE)
campo_id        INT NOT NULL → formulario_campos.id (CASCADE DELETE)
-- AcroForm: nombre del campo en el PDF
pdf_campo_nombre VARCHAR(200)
-- PDF plano: posición relativa (0–100 como porcentaje del ancho/alto de página)
pagina          INT
pos_x           FLOAT   -- % del ancho
pos_y           FLOAT   -- % del alto
ancho           FLOAT   -- % del ancho (para campo de texto)
createdAt       DATETIME
updatedAt       DATETIME
```
Un campo del formulario puede estar mapeado como máximo una vez por plantilla.

### Tabla `formulario_respuestas`
```sql
id              INT PK AUTO_INCREMENT
formulario_id   INT NOT NULL → formularios.id
solicitud_id    INT           → solicitudes.id (nullable)
respondido_por  INT           → usuarios.id (nullable — null si es público)
ip_respondente  VARCHAR(45)
estado          ENUM('pendiente','completado') NOT NULL DEFAULT 'pendiente'
createdAt       DATETIME
updatedAt       DATETIME
```

### Tabla `respuesta_campos`
```sql
id              INT PK AUTO_INCREMENT
respuesta_id    INT NOT NULL → formulario_respuestas.id (CASCADE DELETE)
campo_id        INT NOT NULL → formulario_campos.id
valor           TEXT          -- texto, número, fecha, opción(es)
archivo_url     VARCHAR(500)  -- para tipo archivo o firma (URL Cloudinary)
archivo_public_id VARCHAR(300)
createdAt       DATETIME
updatedAt       DATETIME
```

### Tabla `formulario_pdf_generados`
```sql
id              INT PK AUTO_INCREMENT
respuesta_id    INT NOT NULL → formulario_respuestas.id (CASCADE DELETE)
plantilla_id    INT NOT NULL → formulario_pdf_plantillas.id
url_cloudinary  VARCHAR(500) NOT NULL
public_id       VARCHAR(300) NOT NULL
createdAt       DATETIME
```

---

## Backend

### Archivos nuevos

#### Modelos (`server/src/models/`)
- `Formulario.js`
- `FormularioCampo.js`
- `FormularioPdfPlantilla.js`
- `FormularioPdfMapeo.js`
- `FormularioRespuesta.js`
- `RespuestaCampo.js`
- `FormularioPdfGenerado.js`

Asociaciones a definir en `models/index.js`:
```js
Formulario.hasMany(FormularioCampo, { foreignKey: 'formulario_id', as: 'campos' })
Formulario.hasMany(FormularioPdfPlantilla, { foreignKey: 'formulario_id', as: 'plantillas' })
Formulario.hasMany(FormularioRespuesta, { foreignKey: 'formulario_id', as: 'respuestas' })
FormularioCampo.hasMany(FormularioPdfMapeo, { foreignKey: 'campo_id', as: 'mapeos' })
FormularioPdfPlantilla.hasMany(FormularioPdfMapeo, { foreignKey: 'plantilla_id', as: 'mapeos' })
FormularioRespuesta.hasMany(RespuestaCampo, { foreignKey: 'respuesta_id', as: 'campos' })
FormularioRespuesta.hasOne(FormularioPdfGenerado, { foreignKey: 'respuesta_id', as: 'pdf' })
```

#### Migraciones (`server/src/migrations/`) — en orden
1. `YYYYMMDD-create-formularios.js`
2. `YYYYMMDD-create-formulario-campos.js`
3. `YYYYMMDD-create-formulario-pdf-plantillas.js`
4. `YYYYMMDD-create-formulario-pdf-mapeos.js`
5. `YYYYMMDD-create-formulario-respuestas.js`
6. `YYYYMMDD-create-respuesta-campos.js`
7. `YYYYMMDD-create-formulario-pdf-generados.js`

#### Controladores
**`formularioController.js`**
- `listar` — GET /api/formularios — devuelve formularios del usuario (admin ve todos)
- `crear` — POST /api/formularios
- `actualizar` — PUT /api/formularios/:id
- `eliminar` — DELETE /api/formularios/:id
- `obtener` — GET /api/formularios/:id — incluye campos y última plantilla con mapeos
- `obtenerPublico` — GET /api/formularios/:id/publica — sin auth, solo si `acceso='publico'`
- `listarDisponibles` — GET /api/formularios/disponibles — devuelve formularios activos; si hay auth devuelve los `autenticado` + `publico`; si no hay auth, solo `publico`
- `subirPlantilla` — POST /api/formularios/:id/plantilla — multer → Cloudinary, detecta AcroForm
- `guardarMapeos` — POST /api/formularios/:id/mapeos — reemplaza mapeos existentes

**`formularioRespuestaController.js`**
- `responder` — POST /api/formularios/:id/responder — recibe campos + archivos, genera PDF
- `listarPdfs` — GET /api/formularios/pdfs — historial (admin/tecnico: todos; usuario: solo suyos)
- `descargarPdf` — GET /api/formularios/respuestas/:id/pdf — redirect a URL Cloudinary
- `asociarSolicitud` — PUT /api/formularios/respuestas/:id/solicitud

#### Servicios
**`pdfService.js`**
```
llenarPDF(plantilla, mapeos, respuestaCampos) → Buffer
  — AcroForm: pdfDoc.getForm().getTextField(nombre).setText(valor)
               pdfDoc.getForm().getCheckBox(nombre).check()
               Para firma: getForm().getButton(nombre) → embed PNG
  — Plano: page.drawText(valor, { x: pos_x% * pageWidth, y: pos_y% * pageHeight, ... })
           Para firma: page.drawImage(pngImage, { x, y, width, height })
  — Retorna Buffer del PDF generado
  — Luego el controlador sube el buffer a Cloudinary con resource_type: 'raw'
```

**Dependencia nueva:** `pdf-lib` — agregar a `server/package.json`

Para detectar si un PDF tiene AcroForm al subir la plantilla:
```js
const { PDFDocument } = require('pdf-lib')
const pdfDoc = await PDFDocument.load(buffer)
const form = pdfDoc.getForm()
const fields = form.getFields()
tiene_acroform = fields.length > 0
// Si tiene_acroform: devolver también el array de nombres de campos para el mapper
```

#### Rutas (`routes/formularioRoutes.js`)
```
GET    /api/formularios                         auth (admin|tecnico)
POST   /api/formularios                         auth (admin|tecnico)
GET    /api/formularios/pdfs                    auth (todos los roles)
GET    /api/formularios/:id                     auth (admin|tecnico)
GET    /api/formularios/disponibles             sin auth o auth (lista pública/autenticada)
GET    /api/formularios/:id/publica             sin auth
PUT    /api/formularios/:id                     auth (admin|tecnico)
DELETE /api/formularios/:id                     auth (admin)
POST   /api/formularios/:id/plantilla           auth (admin|tecnico) + multer
POST   /api/formularios/:id/mapeos              auth (admin|tecnico)
POST   /api/formularios/:id/responder           sin auth o auth según formulario
GET    /api/formularios/respuestas/:id/pdf      auth (todos los roles)
PUT    /api/formularios/respuestas/:id/solicitud auth (admin|tecnico)
```

#### Auditoría
Llamar a `registrarAuditoria()` en: crear formulario, editar formulario, eliminar formulario, enviar respuesta, generar PDF. Requerimiento ISO 9001.

---

## Frontend

### Páginas nuevas (`client/src/pages/`)

**`FormulariosPage.jsx`** — `/formularios` (admin/tecnico)
- Lista de formularios del usuario con nombre, estado (activo/inactivo), fecha de creación
- Botón "Nuevo formulario" → redirige al builder
- Acciones por fila: Editar, Ver respuestas, Eliminar

**`FormularioBuilderPage.jsx`** — `/formularios/nuevo` y `/formularios/:id/editar` (admin/tecnico)
- Tres pestañas:
  - **Campos**: lista de campos configurados con botón "Agregar campo", drag para reordenar (con `@dnd-kit/core`)
  - **PDF & Mapeo**: zona de subida del PDF (FileUploadZone) + PDFMapper con chips arrastrables
  - **Configuración**: nombre, descripción, acceso, activo/inactivo

**`FormularioResponderPage.jsx`** — `/formularios/:id/responder` (público o auth)
- Renderiza el formulario dinámico con FormularioRenderer
- Al enviar: POST a `/responder` → muestra PDFSuccessModal

**`FormulariosDisponiblesPage.jsx`** — `/formularios/disponibles` (todos los roles + público)
- Tarjetas de formularios activos disponibles para el usuario
- Cada tarjeta: nombre, descripción, botón "Llenar formulario"
- Sección "Mis respuestas" (si autenticado): lista de PDFs generados propios con botón de descarga

**`FormularioPDFsPage.jsx`** — `/formularios/pdfs` (admin/tecnico)
- Tabla con: formulario, respondente, fecha, acciones (ver, descargar)
- Filtros: por formulario, por fecha

### Componentes nuevos (`client/src/components/formularios/`)

**`CamposList.jsx`**
- Lista de campos del formulario con icono de tipo, etiqueta, badge "Requerido"
- Drag para reordenar (dnd-kit sortable)
- Botones: Editar (abre CampoEditorModal) y Eliminar (con ConfirmDialog)

**`CampoEditorModal.jsx`**
- Modal para crear/editar un campo
- Campos: tipo (Select), etiqueta (Input), descripción (Input), placeholder (Input), requerido (toggle)
- Si tipo = seleccion_unica o seleccion_multiple: input para agregar opciones dinamicamente

**`PDFMapper.jsx`**
- Panel izquierdo: chips de campos del formulario que aún no han sido mapeados (draggables)
- Panel derecho: renderizado del PDF página por página usando `pdfjs-dist` (librería base de Mozilla, distinta de react-pdf)
  - Cada página se renderiza como `<canvas>` → permite superponer un `<div>` overlay con total control
  - El overlay captura eventos de drop: calcula pos_x% = (dropX / canvasWidth) * 100, pos_y% análogo
  - Chips posicionados: muestra etiqueta del campo + botón × para remover
  - Paginador (← página X de N →) para navegar entre páginas; el campo `pagina` del mapeo se asigna según la página activa
- Para PDFs AcroForm: muestra también un `<Select>` de campo PDF por cada chip posicionado (lista de campos detectados al subir el PDF)
- Botón "Guardar mapeo" → POST /api/formularios/:id/mapeos

**Dependencia nueva en cliente:** `pdfjs-dist` (renderer de páginas como canvas, ~400KB gzip)

**`FormularioRenderer.jsx`**
- Renderiza dinámicamente los campos según su tipo:
  - `texto_corto` → `<Input />`
  - `texto_largo` → `<textarea>`
  - `numero` → `<Input type="number" />`
  - `fecha` → `<DatePicker />`
  - `seleccion_unica` → `<Select />` (componente común)
  - `seleccion_multiple` → grupo de checkboxes
  - `archivo` → `<FileUploadZone />` (máx 1 archivo, cualquier tipo)
  - `firma` → `<FirmaCanvas />`
- Valida campos requeridos antes de permitir envío

**`FirmaCanvas.jsx`**
- `<canvas>` con eventos `mousedown/mousemove/mouseup` y `touchstart/touchmove/touchend`
- Botón "Limpiar" limpia el canvas
- Exporta la firma como PNG base64 via `canvas.toDataURL('image/png')`
- El base64 se envía como campo de tipo archivo al backend → sube a Cloudinary

**`PDFSuccessModal.jsx`**
- Modal que se muestra tras envío exitoso del formulario
- Mensaje de confirmación + nombre del PDF generado
- Botón "Descargar PDF" → abre `url_cloudinary` en nueva pestaña
- Botón "Cerrar"

### Integración en `SolicitudModal.jsx`
Nueva sección "Formulario asociado" al final del modal:
- Si `solicitud.formularioRespuesta` existe: nombre del formulario + botón "Descargar PDF"
- Si no existe (y rol es admin/tecnico): botón "Asociar respuesta de formulario" → abre selector de respuestas disponibles del empleado

### Dependencias nuevas en cliente
- `@dnd-kit/core` y `@dnd-kit/sortable` — drag & drop en CamposList y PDFMapper
- `pdfjs-dist` — renderizado de páginas PDF como canvas para el PDFMapper

### Rutas en `routes.jsx`
```jsx
/formularios              → FormulariosPage (admin, tecnico)
/formularios/nuevo        → FormularioBuilderPage (admin, tecnico)
/formularios/:id/editar   → FormularioBuilderPage (admin, tecnico)
/formularios/disponibles  → FormulariosDisponiblesPage (todos)
/formularios/pdfs         → FormularioPDFsPage (admin, tecnico)
/formularios/:id/responder → FormularioResponderPage (público o auth)
```

`/formularios/disponibles` y `/formularios/:id/responder` son accesibles sin autenticación cuando el formulario tiene `acceso = 'publico'`. El backend valida esto en la ruta `/publica`.

---

## Flujo completo

```
1. Admin/Técnico abre /formularios → crea nuevo formulario
2. En pestaña "Campos": agrega campos, define etiquetas y tipos
3. En pestaña "PDF & Mapeo": sube PDF → backend detecta AcroForm
   - Arrastra chips de campos sobre el PDF → guarda mapeo
4. En pestaña "Config": nombre, descripción, acceso, activa el formulario

5. Empleado abre /formularios/disponibles → ve tarjetas → elige formulario
6. En /formularios/:id/responder: llena campos, firma con canvas
7. Envía → backend:
   a. Guarda FormularioRespuesta + RespuestaCampos
   b. Sube firma/archivos a Cloudinary
   c. Descarga PDF plantilla de Cloudinary → llena con pdf-lib
   d. Sube PDF generado a Cloudinary
   e. Guarda FormularioPdfGenerado
8. Frontend: muestra PDFSuccessModal con botón descargar

9. (Opcional) Técnico en SolicitudModal → "Asociar respuesta" → vincula la respuesta al ticket
10. Admin/Técnico en /formularios/pdfs → historial completo de PDFs generados
```

---

## Fuera de alcance

- Vista previa nativa del PDF en el mapper (se agrega `react-pdf` en iteración futura)
- Notificaciones por correo al enviar formulario
- Versionado de formularios (editar un formulario no afecta las respuestas anteriores — el schema se preserva en `respuesta_campos.campo_id`)
- Firma con certificado digital / validez legal (e-firma colombiana)
- Lógica condicional entre campos
- Exportación masiva de respuestas a Excel
