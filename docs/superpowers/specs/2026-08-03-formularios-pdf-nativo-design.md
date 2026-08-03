# Formularios: PDF Nativo del Sistema (sin plantilla)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hoy, un formulario solo genera un PDF descargable si el admin subió una plantilla PDF y mapeó sus campos por posición. Si el formulario no tiene plantilla, la respuesta se guarda sin ningún PDF asociado. Esta mejora agrega un **PDF "nativo"**: un documento con el diseño propio del sistema (branding ISTHO, cabecera, tabla pregunta/respuesta, pie institucional) generado automáticamente al responder cualquier formulario que no tenga plantilla mapeada.

**Architecture:** Nueva función `generarPdfNativo()` en el `pdfService.js` existente (misma librería `pdf-lib`, sin dependencias nuevas). Se invoca desde la rama `else` de la lógica de generación de PDF ya presente en `formularioRespuestaController.js#responder()`. El resultado se guarda en la misma tabla `formulario_pdf_generados`, que gana una columna `tipo` para distinguir el origen y pasa a permitir `plantilla_id` nulo.

**Tech Stack:** Node.js + Express 5 + Sequelize 6 + `pdf-lib` (ya instalado) + Cloudinary (mismo flujo de subida existente, con fallback a filesystem local).

---

## Alcance

- Cubre **exclusivamente** formularios sin plantilla PDF activa. Si el formulario tiene una plantilla mapeada, el comportamiento actual no cambia — el nativo nunca reemplaza ni compite con la plantilla.
- Generación **automática** al responder (misma ubicación en el flujo que el PDF de plantilla), no bajo demanda.
- **No** se regeneran ni se crean retroactivamente PDFs para respuestas históricas que quedaron sin PDF antes de este cambio — quedan como están.
- Layout fijo definido por el sistema; no es configurable por el admin en esta iteración.

---

## Modelo de datos

### Migración: `server/src/migrations/20260803000021-add-tipo-and-nullable-plantilla-to-formulario-pdf-generados.js`

```js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('formulario_pdf_generados', 'plantilla_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('formulario_pdf_generados', 'tipo', {
      type: Sequelize.ENUM('plantilla', 'nativo'),
      allowNull: false,
      defaultValue: 'plantilla',
      after: 'plantilla_id',
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('formulario_pdf_generados', 'tipo');
    await queryInterface.changeColumn('formulario_pdf_generados', 'plantilla_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
```

Todos los registros existentes conservan `tipo = 'plantilla'` por el default (son, de hecho, todos PDFs de plantilla — el nativo no existía aún).

### Modelo actualizado: `FormularioPdfGenerado.js`

```js
plantillaId: { type: DataTypes.INTEGER, allowNull: true, field: 'plantilla_id' },
tipo: { type: DataTypes.ENUM('plantilla', 'nativo'), allowNull: false, defaultValue: 'plantilla' },
```

### Folio — sin columna nueva

El folio impreso en el PDF (`FORM-000123`) se calcula en el momento de generar el documento como `'FORM-' + String(respuesta.id).padStart(6, '0')`. No se persiste: `respuesta.id` ya es estable y único, y está disponible antes de generar el PDF porque `FormularioRespuesta.create()` ocurre antes de la generación (ver `formularioRespuestaController.js:61-69` y `:151-171`).

---

## Backend

### Servicio: `generarPdfNativo()` en `server/src/services/pdfService.js`

```js
async function generarPdfNativo({ formulario, respuesta, respuestaCampos, campos, secciones }) → Buffer
```

**Preparación de datos:**
- `campoMap`: `campoId → RespuestaCampo`, igual patrón que `llenarPDF`.
- Campos a imprimir: los `campos` del formulario que tienen entrada en `campoMap`, ordenados por `orden` (los condicionalmente ocultos ya no llegan aquí porque `respuestaCampos` solo contiene lo que el frontend efectivamente envió — ver `formularioRespuestaController.js:120-146`).
- Agrupar campos por `seccionId`; para cada sección con `visibleParaUsuario: true` se imprime su `nombre` como encabezado antes de sus campos; campos sin sección o de sección no visible se imprimen sueltos, en orden.

**Layout (tamaño Carta 612×792pt, márgenes 50pt):**

Página 1:
1. Franja de cabecera navy (`rgb(0.106, 0.137, 0.251)` ≈ `#1B2340`) de 70pt de alto en la parte superior de la página, con el logo (`logo-blanco.png`, embebido vía `pdfDoc.embedPng`) a la izquierda y el texto "Soporte TI · ISTHO S.A.S." en blanco a la derecha.
2. Debajo, en negro: nombre del formulario en negrita (16pt), y una línea de metadata (10pt, gris): `Folio: FORM-000123    Fecha: 03/08/2026 10:15    Respondido por: Juan Pérez` (o `Anónimo` si no hay `respondidoPor` ni `nombreRespondente`, siguiendo la misma resolución de 3 niveles ya usada en `FormularioRespuestasPage.jsx`).

Páginas siguientes (si el contenido no cabe en una página): encabezado reducido de una sola línea con nombre del formulario + folio (sin la franja navy ni el logo), para no repetir el bloque completo.

Cuerpo (todas las páginas), formato "ficha apilada" — no tabla de columnas fijas, para no comprimir respuestas largas:
- Por cada campo: etiqueta en negrita gris pequeña (9pt) seguida del valor en texto normal (11pt) con wrap automático calculado vía `font.widthOfTextAtSize`.
- Tipo `firma`: etiqueta + imagen PNG embebida (descargada de `archivoUrl` con `axios`, igual que en `llenarPDF`), máx. 150×60pt.
- Tipo `grilla`: tabla dibujada con `page.drawLine` / `page.drawRectangle` reutilizando el mismo patrón visual que ya existe en `llenarPDF` para grillas sobre plantilla (líneas, banda alternada, columna de observaciones) — factorizar la porción de dibujo de tabla de grilla a una función interna compartida si resulta directo; si no, replicar el patrón sin sobre-diseñar una abstracción prematura.
- Tipo `archivo`: etiqueta + el texto del nombre de archivo o URL (sin hipervínculo activo — fuera de alcance).
- Salto de página automático: antes de dibujar cada campo, se calcula su alto estimado; si no cabe en el espacio restante sobre el margen inferior (dejando 40pt para el pie de página), se crea una página nueva con el encabezado reducido.

Pie de página (todas las páginas): línea separadora gris + texto centrado 8pt "Documento generado automáticamente por Sistema de Soporte TI — ISTHO S.A.S." + "Página X de Y" alineado a la derecha. El total de páginas se conoce solo al final, así que se dibuja en una segunda pasada sobre `pdfDoc.getPages()` antes de `pdfDoc.save()`.

### Integración en `responder()` (`formularioRespuestaController.js`)

Reemplaza el bloque actual (líneas 151-171) por una rama con/sin plantilla:

```js
let pdfGenerado = null;
if (formulario.plantillas && formulario.plantillas.length > 0) {
  // rama existente, SIN CAMBIOS: llenarPDF(...) → tipo: 'plantilla', plantillaId: plantilla.id
} else {
  try {
    const pdfBuffer = await generarPdfNativo({
      formulario, respuesta, respuestaCampos,
      campos: formulario.campos, secciones: formulario.secciones,
    });
    const nombreBase = formulario.nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const publicIdBase = `sist-formularios-generados/${nombreBase}_${respuesta.id}`;
    const uploadResult = await _uploadBuffer(pdfBuffer, publicIdBase, req);
    pdfGenerado = await FormularioPdfGenerado.create({
      respuestaId: respuesta.id,
      plantillaId: null,
      tipo: 'nativo',
      urlCloudinary: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (pdfErr) {
    console.error('Error generando PDF nativo:', pdfErr.message);
  }
}
```

- Reutiliza `_uploadBuffer` sin modificaciones (mismo folder `sist-formularios-generados`, mismo fallback a filesystem local cuando no hay credenciales de Cloudinary).
- `registrarAuditoria()` en la línea 174 ya se ejecuta después de esta rama, cubriendo ambos casos — no requiere cambios.
- Si `generarPdfNativo` falla, el comportamiento es igual al de la plantilla: se loguea el error y la respuesta se guarda igualmente sin PDF (no bloquea el envío del formulario).

---

## Frontend

No hay cambios funcionales — los componentes que descargan/muestran el PDF ya leen `pdf.urlCloudinary` de forma agnóstica al origen. Se agrega un indicador visual:

### Badge "Plantilla" / "Generado"

Nuevo mapeo de estilo (junto a los existentes en `client/src/utils/constants.js` o directamente en los componentes, siguiendo el patrón ya usado para `ESTADO_COLORS`):

```js
const PDF_TIPO_LABEL = { plantilla: 'Plantilla', nativo: 'Generado' };
const PDF_TIPO_COLOR = { plantilla: 'slate', nativo: 'cgreen' }; // colores ya soportados por <Badge>
```

- **`FormularioRespuestasPage.jsx`**: en la columna PDF de la tabla, junto al botón de descarga, un `<Badge size="sm">` con el label correspondiente a `respuesta.pdf?.tipo`. Si no hay PDF, no se muestra nada (igual que hoy).
- **`RespuestaDetalleModal.jsx`**: mismo badge junto al bloque de metadata (respondido por / fecha / estado).

`obtenerDetalleRespuesta` (backend) y `listarRespuestasFormulario` ya incluyen el `include` del PDF asociado — solo hay que confirmar que el `tipo` viaja en el payload (viene incluido automáticamente al ser una columna del modelo `FormularioPdfGenerado`, sin cambios en los `attributes` de las consultas salvo que estén explícitamente restringidos).

---

## Reglas de negocio

1. El PDF nativo se genera si y solo si `formulario.plantillas.length === 0` al momento de responder. Nunca coexisten ambos tipos para la misma respuesta.
2. El folio (`FORM-######`) se deriva de `respuesta.id`, es determinístico y no requiere almacenamiento adicional.
3. Los campos condicionalmente ocultos para el respondente no aparecen en el PDF nativo — se deriva directamente de qué `RespuestaCampo` existen, sin lógica adicional de filtrado en el servicio de PDF.
4. Un fallo en `generarPdfNativo()` no bloquea el guardado de la respuesta; se comporta igual que un fallo de `llenarPDF()` hoy (log de error, respuesta completa sin PDF).
5. Respuestas guardadas antes de este cambio permanecen sin PDF si no tenían plantilla — no hay proceso de backfill.

---

## Fuera de alcance

- Personalización del diseño del PDF nativo por el admin (colores, orden de bloques, logo alternativo).
- Generación bajo demanda / regeneración retroactiva para respuestas históricas.
- Enlaces clickeables para campos tipo `archivo` dentro del PDF (se muestra el texto/URL plano).
- Elegir manualmente entre PDF nativo y de plantilla cuando ambos podrían aplicar — la plantilla, si existe, siempre tiene prioridad.
- Firma con validez legal / certificado digital (ya estaba fuera de alcance en el spec original del módulo).
