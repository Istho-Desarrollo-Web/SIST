# Formulario Builder — Secciones y Tipografía PDF

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar secciones colapsables en la pestaña Campos del builder (con visibilidad configurable para el usuario final) y personalización tipográfica (fuente, negrita, cursiva, color) en el inspector del PDFMapper.

**Architecture:** Dos features independientes que comparten la misma sesión de implementación. Secciones toca el modelo `formulario_campos` + nueva tabla `formulario_secciones` + UI en `CamposList.jsx` + renderizado en el formulario público. Tipografía toca `formulario_pdf_mapeos` + inspector de `PDFMapper.jsx` + `pdfService.js`.

**Tech Stack:** React 19 + Tailwind v4 + Lucide React (iconos), Node/Express + Sequelize 6 + pdf-lib (StandardFonts)

---

## Feature 1 — Secciones del formulario

### Comportamiento

- Las secciones son contenedores visuales de campos dentro de la **pestaña Campos** del builder.
- El administrador puede crear, renombrar, reordenar y eliminar secciones.
- Cada sección tiene un toggle **Visible para usuario** (default: `false`).
  - `visibleParaUsuario = true` → en el formulario público, la sección aparece como un bloque colapsable con encabezado.
  - `visibleParaUsuario = false` → sus campos se renderizan sueltos, sin encabezado, como si no hubiera sección.
- Los campos sin sección asignada se muestran en un bucket **"Sin sección"** al final de la lista (solo en el builder).
- Las secciones **no afectan el PDF** generado en ningún caso.

### Modelo de datos

**Nueva tabla `formulario_secciones`:**

```sql
id             INTEGER PK AUTO_INCREMENT
formularioId   INTEGER NOT NULL FK → formularios.id ON DELETE CASCADE
nombre         VARCHAR(200) NOT NULL
orden          INTEGER NOT NULL DEFAULT 0
visibleParaUsuario BOOLEAN NOT NULL DEFAULT false
createdAt      DATETIME
updatedAt      DATETIME
```

**Cambio en `formulario_campos`:**

```sql
seccionId      INTEGER NULL FK → formulario_secciones.id ON DELETE SET NULL
```

### Migraciones necesarias

1. `CREATE TABLE formulario_secciones` con los campos anteriores.
2. `ALTER TABLE formulario_campos ADD COLUMN seccionId INTEGER NULL`, luego `ADD FOREIGN KEY`.

### API

Las secciones se guardan junto con los campos en el endpoint existente `POST /formularios/:id/campos`. El payload se amplía:

```json
{
  "secciones": [
    { "id": null, "nombre": "Información del solicitante", "orden": 0, "visibleParaUsuario": true },
    { "id": 2,    "nombre": "Descripción del problema",   "orden": 1, "visibleParaUsuario": false }
  ],
  "campos": [
    { "id": null, "tipo": "texto_corto", "etiqueta": "Nombre completo", "seccionId": null, "orden": 0 }
  ]
}
```

El controlador hace upsert de secciones (crea las nuevas, actualiza las existentes, elimina las que ya no están), actualiza `seccionId` en cada campo, y devuelve el formulario completo con secciones.

El endpoint `GET /formularios/:id` (o el que carga el formulario completo) debe incluir `secciones` en la respuesta, ordenadas por `orden`.

El formulario público (`GET /formularios/disponibles` o `/formularios/:id/publica`) incluye secciones con `visibleParaUsuario = true` y la lista de campos de cada sección, más los campos sin sección.

### UI — Builder (`CamposList.jsx`)

**Toolbar:**
- Botón "Agregar campo" (existente).
- Botón nuevo "Agregar sección" con icono `FolderPlus` de Lucide.

**Sección (componente `SeccionItem`):**
- Encabezado con fondo `navy-800` y texto blanco.
- Icono `ChevronDown` / `ChevronRight` para colapsar/expandir.
- Nombre editable inline (click en el texto abre un input).
- Toggle visual (pill izquierda/derecha) con icono `Eye` / `EyeOff` de Lucide para `visibleParaUsuario`. Color verde (`cgreen-500`) cuando activo, gris cuando inactivo.
- Icono `Pencil` para renombrar.
- Icono `Trash2` para eliminar (muestra confirm antes de borrar; los campos pasan a sin sección).
- Los campos dentro se muestran con el mismo componente actual pero indentados.

**Bucket "Sin sección":**
- Borde punteado `slate-300`, fondo `slate-50`.
- Etiqueta `SIN SECCIÓN` en mayúsculas, gris, `text-xs`.
- Solo visible si hay al menos un campo sin sección asignada.

**Arrastrar y soltar:**
- Los campos pueden arrastrarse entre secciones (y al bucket sin sección).
- El reordenamiento dentro de la misma sección funciona igual que hoy con `@dnd-kit`.

### UI — Formulario público

- Si una sección tiene `visibleParaUsuario = true`, se renderiza un encabezado colapsable con fondo `navy-800` y texto blanco, icono `ChevronDown` / `ChevronRight`. Estado inicial: expandido.
- Los campos de esa sección se muestran dentro del bloque colapsable.
- Si `visibleParaUsuario = false`, sus campos se renderizan planos, sin encabezado.
- Los campos sin sección siempre se renderizan planos al final.
- No hay emojis: todos los iconos son de Lucide React.

---

## Feature 2 — Tipografía en PDFMapper

### Comportamiento

- En el inspector de propiedades del PDFMapper (panel derecho al seleccionar un campo mapeado), se agrega una sección **Tipografía** debajo de los controles de posición/tamaño existentes.
- Los controles disponibles:
  - **Fuente:** dropdown con 3 opciones: `Helvetica`, `Times New Roman`, `Courier`. Default: `Helvetica`.
  - **Tamaño (pt):** ya existe (`fontTamano`), se mantiene.
  - **Negrita (B):** toggle button. Default: `false`.
  - **Cursiva (I):** toggle button. Default: `false`.
  - **Color:** swatch clickeable que abre un `<input type="color">` nativo + campo de texto hex editable. Default: `#000000`.
- Vista previa de texto en tiempo real dentro del inspector (muestra "Texto de ejemplo" con los estilos aplicados).
- Los cambios aplican al guardar mapeos (botón existente), no al instante.

### Modelo de datos

**Cambio en `formulario_pdf_mapeos`:**

```sql
fontFamilia   ENUM('Helvetica','TimesRoman','Courier') NOT NULL DEFAULT 'Helvetica'
fontNegrita   BOOLEAN NOT NULL DEFAULT false
fontCursiva   BOOLEAN NOT NULL DEFAULT false
fontColor     VARCHAR(7) NOT NULL DEFAULT '#000000'
```

### Migración

`ALTER TABLE formulario_pdf_mapeos ADD COLUMN fontFamilia ...`, y las 3 columnas restantes.

### Lógica en `pdfService.js`

Mapeo de familia + negrita + cursiva a `StandardFonts` de pdf-lib:

| Familia     | Negrita | Cursiva | StandardFonts                        |
|-------------|---------|---------|--------------------------------------|
| Helvetica   | false   | false   | `Helvetica`                          |
| Helvetica   | true    | false   | `HelveticaBold`                      |
| Helvetica   | false   | true    | `HelveticaOblique`                   |
| Helvetica   | true    | true    | `HelveticaBoldOblique`               |
| TimesRoman  | false   | false   | `TimesRoman`                         |
| TimesRoman  | true    | false   | `TimesBold`                          |
| TimesRoman  | false   | true    | `TimesItalic`                        |
| TimesRoman  | true    | true    | `TimesBoldItalic`                    |
| Courier     | false   | false   | `Courier`                            |
| Courier     | true    | false   | `CourierBold`                        |
| Courier     | false   | true    | `CourierOblique`                     |
| Courier     | true    | true    | `CourierBoldOblique`                 |

El color `fontColor` (hex `#RRGGBB`) se convierte a `rgb(r/255, g/255, b/255)` usando el helper de pdf-lib.

Si `fontFamilia` / `fontColor` / `fontNegrita` / `fontCursiva` son `null` (campos mapeados antes de esta feature), se usan los defaults: `Helvetica`, `false`, `false`, `#000000`.

### UI — Inspector `PDFMapper.jsx`

La sección Tipografía aparece debajo del separador de posición/tamaño:

```
[ FUENTE dropdown ]  [ PT input ]
[ B toggle ] [ I toggle ]   [ COLOR swatch ] [ #hex input ]
[ Vista previa: "Texto de ejemplo" ]
```

- Iconos: `Bold` y `Italic` de Lucide para los toggles B/I.
- El toggle activo tiene fondo `navy-800` y texto blanco; inactivo tiene fondo blanco y borde gris.
- Sin emojis — todos los iconos son Lucide React.

---

## Archivos a crear o modificar

| Archivo | Acción |
|---------|--------|
| `server/src/migrations/20260525000013-add-secciones-formulario.js` | Crear (nueva tabla + columna en campos) |
| `server/src/migrations/20260525000014-add-tipografia-pdf-mapeos.js` | Crear (4 columnas en mapeos) |
| `server/src/models/FormularioSeccion.js` | Crear |
| `server/src/models/FormularioCampo.js` | Modificar (agregar asociación `seccionId`) |
| `server/src/models/index.js` | Modificar (registrar FormularioSeccion + asociaciones) |
| `server/src/models/FormularioPdfMapeo.js` | Modificar (nuevas columnas tipografía) |
| `server/src/controllers/formularioController.js` | Modificar (upsert secciones en guardarCampos, incluir secciones en GET) |
| `server/src/services/pdfService.js` | Modificar (mapeo StandardFonts + color) |
| `client/src/pages/FormularioBuilderPage.jsx` | Modificar (estado secciones, pasar a CamposList) |
| `client/src/components/formularios/CamposList.jsx` | Modificar (secciones colapsables, drag entre secciones) |
| `client/src/components/formularios/SeccionItem.jsx` | Crear (componente sección builder) |
| `client/src/components/formularios/PDFMapper.jsx` | Modificar (inspector tipografía) |
| `client/src/pages/FormularioResponderPage.jsx` | Modificar (renderizar secciones visibles como colapsables) |
