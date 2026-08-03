# Formularios: PDF Nativo del Sistema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando un formulario no tiene plantilla PDF mapeada, generar automáticamente al responder un PDF con diseño propio del sistema (branding ISTHO, tabla pregunta/respuesta, folio, pie institucional) en lugar de no generar ningún PDF.

**Architecture:** Nueva función `generarPdfNativo()` en el `pdfService.js` existente (misma librería `pdf-lib`, cero dependencias nuevas), invocada desde la rama `else` de la lógica de PDF ya presente en `formularioRespuestaController.js#responder()`. Se guarda en la misma tabla `formulario_pdf_generados`, que gana una columna `tipo` y permite `plantilla_id` nulo.

**Tech Stack:** Node.js + Express 5 + Sequelize 6 + `pdf-lib` (`^1.17.1`, ya instalado) + Cloudinary (mismo flujo de subida existente, con fallback a filesystem).

## Global Constraints

- No agregar dependencias npm nuevas — usar únicamente `pdf-lib`, `fs`, `path`, `axios` (todas ya presentes en `server/package.json`).
- Seguir el patrón de nombres de migración ya usado en el proyecto: `YYYYMMDDHHMMSS-descripcion-en-kebab-case.js` (la última migración existente es `20260626000020-...`).
- Todas las columnas de BD usan `snake_case`; los modelos Sequelize usan `underscored: true` y exponen `camelCase` en JS vía `field:`.
- No hay framework de test automatizado en `server/` (sin Jest/Mocha, sin script `test` en `package.json`). La verificación de cada tarea de backend es manual: ejecutar un script Node ad-hoc y/o correr `npm run db:migrate`, inspeccionar el resultado, y borrar cualquier archivo temporal antes de commitear.
- Sin emojis en UI — iconos vía `lucide-react` únicamente (coherente con el resto del módulo Formularios).
- Todo cambio de escritura en BD ya pasa por `registrarAuditoria()` en el flujo existente de `responder()` — no se requiere una llamada nueva, solo no romper la existente.

---

### Task 1: Copiar el asset del logo al backend

El logo de marca (`logo-blanco.png`) hoy solo vive en `client/public/`, servido por el frontend. El backend necesita el archivo en disco para embeberlo en el PDF con `pdf-lib` — no se debe depender de una petición HTTP al frontend en producción (dominio distinto, disponibilidad no garantizada).

**Files:**
- Create: `soporte-ti-istho/server/src/assets/logo-blanco.png` (copia binaria)

**Interfaces:**
- Produces: archivo en disco en la ruta `server/src/assets/logo-blanco.png`, consumido por `pdfService.js` en la Task 3 vía `fs.readFileSync`.

- [ ] **Step 1: Crear la carpeta `assets` y copiar el logo**

```bash
mkdir -p soporte-ti-istho/server/src/assets
cp soporte-ti-istho/client/public/logo-blanco.png soporte-ti-istho/server/src/assets/logo-blanco.png
```

- [ ] **Step 2: Verificar que el archivo copiado es un PNG válido**

Run: `node -e "const fs=require('fs'); const b=fs.readFileSync('soporte-ti-istho/server/src/assets/logo-blanco.png'); console.log(b.length, b.slice(0,8).toString('hex'))"`
Expected: imprime un tamaño en bytes > 0 y la firma PNG `89504e470d0a1a0a`.

- [ ] **Step 3: Commit**

```bash
git add soporte-ti-istho/server/src/assets/logo-blanco.png
git commit -m "feat: agregar asset de logo al backend para PDF nativo"
```

---

### Task 2: Migración BD + modelo `FormularioPdfGenerado`

**Files:**
- Create: `soporte-ti-istho/server/src/migrations/20260803000021-add-tipo-and-nullable-plantilla-to-formulario-pdf-generados.js`
- Modify: `soporte-ti-istho/server/src/models/FormularioPdfGenerado.js`

**Interfaces:**
- Produces: columna `formulario_pdf_generados.tipo` (`ENUM('plantilla','nativo')`, default `'plantilla'`), `formulario_pdf_generados.plantilla_id` ahora nullable. Modelo `FormularioPdfGenerado` expone `tipo` (string) y `plantillaId` (number|null) en camelCase — usados por la Task 5 (creación) y Task 6 (lectura).

- [ ] **Step 1: Escribir la migración**

```js
// soporte-ti-istho/server/src/migrations/20260803000021-add-tipo-and-nullable-plantilla-to-formulario-pdf-generados.js
'use strict';

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
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('formulario_pdf_generados', 'tipo');
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_formulario_pdf_generados_tipo\";").catch(() => {});
    await queryInterface.changeColumn('formulario_pdf_generados', 'plantilla_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
```

- [ ] **Step 2: Correr la migración y verificar**

Run: `cd soporte-ti-istho/server && npm run db:migrate`
Expected: la salida lista `20260803000021-add-tipo-and-nullable-plantilla-to-formulario-pdf-generados.js` como migrada, sin errores.

Verificar la estructura resultante:
Run: `cd soporte-ti-istho/server && node -e "require('./src/config/database').getQueryInterface().describeTable('formulario_pdf_generados').then(r => console.log(JSON.stringify(r, null, 2)))"`
Expected: el JSON incluye `"tipo"` con `allowNull: false` y `"plantilla_id"` con `allowNull: true`.

- [ ] **Step 3: Verificar el rollback (down) y volver a migrar**

Run: `cd soporte-ti-istho/server && npm run db:migrate:undo && npm run db:migrate`
Expected: ambos comandos terminan sin error; al finalizar, la tabla vuelve a tener `tipo` y `plantilla_id` nullable (mismo estado que en el Step 2).

- [ ] **Step 4: Actualizar el modelo**

```js
// soporte-ti-istho/server/src/models/FormularioPdfGenerado.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioPdfGenerado extends Model {}

FormularioPdfGenerado.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  respuestaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'respuesta_id',
  },
  plantillaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'plantilla_id',
  },
  tipo: {
    type: DataTypes.ENUM('plantilla', 'nativo'),
    allowNull: false,
    defaultValue: 'plantilla',
  },
  urlCloudinary: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'url_cloudinary',
  },
  publicId: {
    type: DataTypes.STRING(300),
    allowNull: false,
    field: 'public_id',
  },
}, {
  sequelize,
  modelName: 'FormularioPdfGenerado',
  tableName: 'formulario_pdf_generados',
  underscored: true,
  updatedAt: false,
});

module.exports = FormularioPdfGenerado;
```

- [ ] **Step 5: Verificar que el modelo carga sin errores**

Run: `cd soporte-ti-istho/server && node -e "const {FormularioPdfGenerado} = require('./src/models'); console.log(Object.keys(FormularioPdfGenerado.rawAttributes))"`
Expected: imprime un array que incluye `'id', 'respuestaId', 'plantillaId', 'tipo', 'urlCloudinary', 'publicId'`, sin lanzar excepción.

- [ ] **Step 6: Commit**

```bash
git add soporte-ti-istho/server/src/migrations/20260803000021-add-tipo-and-nullable-plantilla-to-formulario-pdf-generados.js soporte-ti-istho/server/src/models/FormularioPdfGenerado.js
git commit -m "feat: columna tipo y plantilla_id nullable en formulario_pdf_generados"
```

---

### Task 3: `generarPdfNativo()` — esqueleto (cabecera, pie de página, texto, paginación)

Construye el caso general: cabecera de marca en la página 1, encabezado reducido en páginas siguientes, campos de texto con wrap y paginación automática, pie de página con folio/número de página. Los tipos especiales (`firma`, `grilla`) y las secciones se agregan en la Task 4 — este esqueleto ya genera un PDF válido y completo para formularios que solo usan campos de texto/número/fecha/selección.

**Files:**
- Modify: `soporte-ti-istho/server/src/services/pdfService.js`

**Interfaces:**
- Consumes: `fs`, `path` (Node core), `PDFDocument, StandardFonts, rgb` de `pdf-lib` (ya importados en el archivo), `axios` (ya importado).
- Produces: `async function generarPdfNativo({ formulario, respuesta, respuestaCampos, campos, secciones, nombreRespondente }) → Buffer`. `formulario` es una instancia `Formulario` (usa `.nombre`), `respuesta` es una instancia `FormularioRespuesta` (usa `.id`, `.createdAt`), `nombreRespondente` es un `string|null` ya resuelto por el caller (no se deriva de `respuesta.respondedor` porque en el flujo real de `responder()` esa asociación no viene incluida — ver Task 5), `respuestaCampos` es un array de `RespuestaCampo` (usa `.campoId`, `.valor`, `.archivoUrl`), `campos` es un array de `FormularioCampo` (usa `.id`, `.etiqueta`, `.tipo`, `.orden`, `.seccionId`, `.opciones`), `secciones` es un array de `FormularioSeccion` (usa `.id`, `.nombre`, `.visibleParaUsuario`) — usado por la Task 4.
- Exported junto a `llenarPDF` en `module.exports`.

- [ ] **Step 1: Agregar imports y constantes al inicio de `pdfService.js`**

Insertar después de la línea `const { descargarBuffer: cloudinaryDescargar } = require('../config/cloudinary');` (línea 3):

```js
const fs = require('fs');
const path = require('path');

const NATIVO_LOGO_PATH = path.join(__dirname, '../assets/logo-blanco.png');
const NATIVO_PAGE_W = 612;
const NATIVO_PAGE_H = 792;
const NATIVO_MARGIN = 50;
const NATIVO_HEADER_H = 70;
const NATIVO_CONTENT_W = NATIVO_PAGE_W - NATIVO_MARGIN * 2;
const NATIVO_NAVY = rgb(0.106, 0.137, 0.251);
const NATIVO_GRAY_TEXT = rgb(0.4, 0.4, 0.4);
const NATIVO_GRAY_LINE = rgb(0.8, 0.8, 0.8);
const NATIVO_BLACK = rgb(0.1, 0.1, 0.1);

function wrapTextoNativo(font, size, texto, maxWidth) {
  const palabras = String(texto).split(/\s+/);
  const lineas = [];
  let actual = '';
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && font.widthOfTextAtSize(prueba, size) > maxWidth) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}
```

- [ ] **Step 2: Agregar la función `generarPdfNativo` (esqueleto sin firma/grilla/secciones)**

Insertar antes de `module.exports = { llenarPDF };` (última línea del archivo):

```js
async function generarPdfNativo({ formulario, respuesta, respuestaCampos, campos, secciones = [], nombreRespondente }) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await pdfDoc.embedPng(fs.readFileSync(NATIVO_LOGO_PATH));

  const folio = `FORM-${String(respuesta.id).padStart(6, '0')}`;
  const fechaTexto = new Date(respuesta.createdAt || Date.now()).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const nombreMostrado = nombreRespondente || 'Anónimo';

  const ctx = { pdfDoc, page: null, y: 0 };

  function espacioDisponible() {
    return ctx.y - NATIVO_MARGIN - 40;
  }

  function nuevaPagina(esPrimera) {
    ctx.page = ctx.pdfDoc.addPage([NATIVO_PAGE_W, NATIVO_PAGE_H]);
    if (esPrimera) {
      ctx.page.drawRectangle({
        x: 0, y: NATIVO_PAGE_H - NATIVO_HEADER_H,
        width: NATIVO_PAGE_W, height: NATIVO_HEADER_H, color: NATIVO_NAVY,
      });
      const logoDims = logoImage.scaleToFit(40, 40);
      ctx.page.drawImage(logoImage, {
        x: NATIVO_MARGIN,
        y: NATIVO_PAGE_H - NATIVO_HEADER_H + (NATIVO_HEADER_H - logoDims.height) / 2,
        width: logoDims.width,
        height: logoDims.height,
      });
      const marcaTexto = 'Soporte TI · ISTHO S.A.S.';
      const marcaWidth = fontBold.widthOfTextAtSize(marcaTexto, 12);
      ctx.page.drawText(marcaTexto, {
        x: NATIVO_PAGE_W - NATIVO_MARGIN - marcaWidth,
        y: NATIVO_PAGE_H - NATIVO_HEADER_H / 2 - 4,
        size: 12, font: fontBold, color: rgb(1, 1, 1),
      });

      ctx.y = NATIVO_PAGE_H - NATIVO_HEADER_H - 30;
      ctx.page.drawText(formulario.nombre, {
        x: NATIVO_MARGIN, y: ctx.y, size: 16, font: fontBold, color: NATIVO_BLACK,
      });
      ctx.y -= 20;
      const metaTexto = `Folio: ${folio}    Fecha: ${fechaTexto}    Respondido por: ${nombreMostrado}`;
      ctx.page.drawText(metaTexto, {
        x: NATIVO_MARGIN, y: ctx.y, size: 10, font: fontRegular, color: NATIVO_GRAY_TEXT,
      });
      ctx.y -= 25;
    } else {
      ctx.y = NATIVO_PAGE_H - NATIVO_MARGIN;
      const encabezado = `${formulario.nombre}  ·  ${folio}`;
      ctx.page.drawText(encabezado, {
        x: NATIVO_MARGIN, y: ctx.y, size: 10, font: fontBold, color: NATIVO_GRAY_TEXT,
      });
      ctx.y -= 20;
    }
  }

  nuevaPagina(true);

  const campoMap = new Map(respuestaCampos.map((rc) => [rc.campoId, rc]));
  const camposOrdenados = campos
    .filter((c) => campoMap.has(c.id))
    .sort((a, b) => a.orden - b.orden);

  for (const campo of camposOrdenados) {
    const rc = campoMap.get(campo.id);

    const valorTexto = rc.valor || 'Sin respuesta';
    const lineas = wrapTextoNativo(fontRegular, 11, valorTexto, NATIVO_CONTENT_W);
    const altoNecesario = 14 + lineas.length * 14 + 12;
    if (espacioDisponible() < altoNecesario) nuevaPagina(false);

    ctx.page.drawText(campo.etiqueta, {
      x: NATIVO_MARGIN, y: ctx.y, size: 9, font: fontBold, color: NATIVO_GRAY_TEXT,
    });
    ctx.y -= 14;
    for (const linea of lineas) {
      ctx.page.drawText(linea, {
        x: NATIVO_MARGIN, y: ctx.y, size: 11, font: fontRegular, color: NATIVO_BLACK,
      });
      ctx.y -= 14;
    }
    ctx.y -= 12;
  }

  const paginas = ctx.pdfDoc.getPages();
  const totalPaginas = paginas.length;
  paginas.forEach((p, idx) => {
    p.drawLine({
      start: { x: NATIVO_MARGIN, y: NATIVO_MARGIN },
      end: { x: NATIVO_PAGE_W - NATIVO_MARGIN, y: NATIVO_MARGIN },
      thickness: 0.5, color: NATIVO_GRAY_LINE,
    });
    p.drawText('Documento generado automáticamente por Sistema de Soporte TI — ISTHO S.A.S.', {
      x: NATIVO_MARGIN, y: NATIVO_MARGIN - 14, size: 8, font: fontRegular, color: NATIVO_GRAY_TEXT,
    });
    const paginaTexto = `Página ${idx + 1} de ${totalPaginas}`;
    const paginaWidth = fontRegular.widthOfTextAtSize(paginaTexto, 8);
    p.drawText(paginaTexto, {
      x: NATIVO_PAGE_W - NATIVO_MARGIN - paginaWidth, y: NATIVO_MARGIN - 14,
      size: 8, font: fontRegular, color: NATIVO_GRAY_TEXT,
    });
  });

  return Buffer.from(await ctx.pdfDoc.save());
}
```

- [ ] **Step 3: Exportar la función nueva**

Reemplazar la última línea del archivo:

```js
module.exports = { llenarPDF };
```

por:

```js
module.exports = { llenarPDF, generarPdfNativo };
```

- [ ] **Step 4: Verificar con un script ad-hoc (datos mock, sin BD)**

Crear un archivo temporal (NO se commitea):

```js
// soporte-ti-istho/server/tmp-verificar-pdf-nativo.js
const fs = require('fs');
const { generarPdfNativo } = require('./src/services/pdfService');

async function main() {
  const buffer = await generarPdfNativo({
    formulario: { nombre: 'Formulario de prueba' },
    respuesta: { id: 42, createdAt: new Date() },
    nombreRespondente: 'Prueba Manual',
    respuestaCampos: [
      { campoId: 1, valor: 'Juan Pérez' },
      { campoId: 2, valor: 'Esta es una respuesta larga que debería envolverse en varias líneas dentro del PDF generado para verificar que el wrap de texto funciona correctamente cuando el contenido excede el ancho disponible de la página carta.' },
    ],
    campos: [
      { id: 1, etiqueta: 'Nombre completo', tipo: 'texto_corto', orden: 0, seccionId: null },
      { id: 2, etiqueta: 'Comentarios', tipo: 'texto_largo', orden: 1, seccionId: null },
    ],
    secciones: [],
  });
  fs.writeFileSync('tmp-output.pdf', buffer);
  console.log('PDF generado:', buffer.length, 'bytes');
}

main().catch((err) => { console.error(err); process.exit(1); });
```

Run: `cd soporte-ti-istho/server && node tmp-verificar-pdf-nativo.js`
Expected: imprime `PDF generado: <N> bytes` sin lanzar excepción, y crea `tmp-output.pdf`.

Abrir `soporte-ti-istho/server/tmp-output.pdf` y verificar visualmente: franja navy con logo en la parte superior, título "Formulario de prueba", línea de folio/fecha/respondente, los dos campos con su etiqueta y valor (el segundo con wrap en varias líneas), pie de página con el texto institucional y "Página 1 de 1".

- [ ] **Step 5: Limpiar archivos temporales**

```bash
rm soporte-ti-istho/server/tmp-verificar-pdf-nativo.js soporte-ti-istho/server/tmp-output.pdf
```

Run: `cd soporte-ti-istho && git status --short soporte-ti-istho/server`
Expected: no aparece ningún archivo `tmp-*` sin trackear.

- [ ] **Step 6: Commit**

```bash
git add soporte-ti-istho/server/src/services/pdfService.js
git commit -m "feat: esqueleto de generarPdfNativo (cabecera, pie, texto, paginacion)"
```

---

### Task 4: `generarPdfNativo()` — firma, grilla y secciones

Extiende el esqueleto de la Task 3 para manejar los tipos de campo especiales y agrupar campos bajo el encabezado de su sección cuando ésta es visible para el usuario, replicando la misma regla ya usada en el formulario público (`visibleParaUsuario`).

**Files:**
- Modify: `soporte-ti-istho/server/src/services/pdfService.js`

**Interfaces:**
- Consumes: `generarPdfNativo` de la Task 3 (mismo archivo, misma función — se modifica el loop principal).
- Produces: función interna `dibujarGrillaNativa(ctx, { campo, rc, fontRegular, fontBold, nuevaPagina, espacioDisponible })` — no exportada, uso interno del archivo.

- [ ] **Step 1: Agregar `dibujarGrillaNativa` antes de `generarPdfNativo`**

```js
function dibujarGrillaNativa(ctx, { campo, rc, fontRegular, fontBold, nuevaPagina, espacioDisponible }) {
  let grillaData = [];
  try {
    const parsed = JSON.parse(rc.valor);
    if (Array.isArray(parsed)) grillaData = parsed;
  } catch { /* valor no es JSON válido */ }

  const opciones = campo.opciones && typeof campo.opciones === 'object' ? campo.opciones : {};
  const filasLabels = Array.isArray(opciones.filas) ? opciones.filas : [];
  const columnas = Array.isArray(opciones.columnas) ? opciones.columnas : ['B', 'R', 'M', 'N/A'];
  const conObs = Boolean(opciones.conObservaciones);

  const rowH = 18;
  const alturaTotal = 16 + rowH * (filasLabels.length + 1) + 14;
  if (espacioDisponible() < alturaTotal) nuevaPagina(false);

  ctx.page.drawText(campo.etiqueta, {
    x: NATIVO_MARGIN, y: ctx.y, size: 9, font: fontBold, color: NATIVO_GRAY_TEXT,
  });
  ctx.y -= 16;

  const labelW = NATIVO_CONTENT_W * 0.4;
  const obsW = conObs ? NATIVO_CONTENT_W * 0.2 : 0;
  const colsW = NATIVO_CONTENT_W - labelW - obsW;
  const colW = colsW / columnas.length;

  ctx.page.drawRectangle({
    x: NATIVO_MARGIN, y: ctx.y - rowH, width: NATIVO_CONTENT_W, height: rowH, color: rgb(0.9, 0.9, 0.9),
  });
  ctx.page.drawText('Ítem', {
    x: NATIVO_MARGIN + 4, y: ctx.y - rowH + 5, size: 8, font: fontBold, color: NATIVO_BLACK,
  });
  columnas.forEach((col, c) => {
    const cx = NATIVO_MARGIN + labelW + c * colW;
    const tw = fontBold.widthOfTextAtSize(String(col), 8);
    ctx.page.drawText(String(col), {
      x: cx + (colW - tw) / 2, y: ctx.y - rowH + 5, size: 8, font: fontBold, color: NATIVO_BLACK,
    });
  });
  if (conObs) {
    ctx.page.drawText('Obs.', {
      x: NATIVO_MARGIN + labelW + colsW + 4, y: ctx.y - rowH + 5, size: 8, font: fontBold, color: NATIVO_BLACK,
    });
  }
  ctx.y -= rowH;

  filasLabels.forEach((filaLabel, i) => {
    const entry = grillaData.find((e) => Number(e.fila) === i) || { columna: null, observacion: '' };
    if (i % 2 === 0) {
      ctx.page.drawRectangle({
        x: NATIVO_MARGIN, y: ctx.y - rowH, width: NATIVO_CONTENT_W, height: rowH, color: rgb(0.96, 0.96, 0.96),
      });
    }
    const filaLabelTexto = String(filaLabel).length > 45 ? `${String(filaLabel).slice(0, 42)}...` : String(filaLabel);
    ctx.page.drawText(filaLabelTexto, {
      x: NATIVO_MARGIN + 4, y: ctx.y - rowH + 5, size: 8, font: fontRegular, color: NATIVO_BLACK,
    });
    columnas.forEach((col, c) => {
      if (entry.columna === col) {
        const cx = NATIVO_MARGIN + labelW + c * colW;
        ctx.page.drawRectangle({
          x: cx + 3, y: ctx.y - rowH + 3, width: colW - 6, height: rowH - 6, color: NATIVO_NAVY,
        });
      }
    });
    if (conObs && entry.observacion) {
      const obsTexto = String(entry.observacion).length > 22
        ? `${String(entry.observacion).slice(0, 19)}...`
        : String(entry.observacion);
      ctx.page.drawText(obsTexto, {
        x: NATIVO_MARGIN + labelW + colsW + 4, y: ctx.y - rowH + 5, size: 7, font: fontRegular, color: NATIVO_BLACK,
      });
    }
    ctx.page.drawLine({
      start: { x: NATIVO_MARGIN, y: ctx.y - rowH },
      end: { x: NATIVO_MARGIN + NATIVO_CONTENT_W, y: ctx.y - rowH },
      thickness: 0.3, color: NATIVO_GRAY_LINE,
    });
    ctx.y -= rowH;
  });

  ctx.page.drawLine({
    start: { x: NATIVO_MARGIN, y: ctx.y },
    end: { x: NATIVO_MARGIN + NATIVO_CONTENT_W, y: ctx.y },
    thickness: 0.5, color: NATIVO_GRAY_LINE,
  });
  ctx.y -= 14;
}
```

- [ ] **Step 2: Modificar el loop principal de `generarPdfNativo` para manejar secciones, firma y grilla**

Reemplazar el bloque del loop (dentro de `generarPdfNativo`, desde `for (const campo of camposOrdenados) {` hasta su cierre `}`) por:

```js
  const seccionMap = new Map((secciones || []).map((s) => [s.id, s]));
  let seccionActual;

  for (const campo of camposOrdenados) {
    const seccion = campo.seccionId ? seccionMap.get(campo.seccionId) : null;
    const mostrarSeccion = seccion && seccion.visibleParaUsuario;
    if (mostrarSeccion && seccion.id !== seccionActual) {
      if (espacioDisponible() < 30) nuevaPagina(false);
      ctx.page.drawRectangle({
        x: NATIVO_MARGIN, y: ctx.y - 18, width: NATIVO_CONTENT_W, height: 20, color: rgb(0.93, 0.94, 0.97),
      });
      ctx.page.drawText(seccion.nombre, {
        x: NATIVO_MARGIN + 6, y: ctx.y - 13, size: 10, font: fontBold, color: NATIVO_NAVY,
      });
      ctx.y -= 30;
      seccionActual = seccion.id;
    } else if (!mostrarSeccion) {
      seccionActual = undefined;
    }

    const rc = campoMap.get(campo.id);

    if (campo.tipo === 'firma' && rc.archivoUrl) {
      if (espacioDisponible() < 80) nuevaPagina(false);
      ctx.page.drawText(campo.etiqueta, {
        x: NATIVO_MARGIN, y: ctx.y, size: 9, font: fontBold, color: NATIVO_GRAY_TEXT,
      });
      ctx.y -= 14;
      try {
        const imgResp = await axios.get(rc.archivoUrl, { responseType: 'arraybuffer' });
        const pngImage = await ctx.pdfDoc.embedPng(imgResp.data);
        const dims = pngImage.scaleToFit(150, 60);
        ctx.page.drawImage(pngImage, { x: NATIVO_MARGIN, y: ctx.y - dims.height, width: dims.width, height: dims.height });
        ctx.y -= dims.height + 15;
      } catch (imgErr) {
        console.warn(`[pdfService] generarPdfNativo: firma fallo campoId=${campo.id}:`, imgErr.message);
        ctx.y -= 15;
      }
      continue;
    }

    if (campo.tipo === 'grilla' && rc.valor) {
      dibujarGrillaNativa(ctx, { campo, rc, fontRegular, fontBold, nuevaPagina, espacioDisponible });
      continue;
    }

    const valorTexto = rc.valor || 'Sin respuesta';
    const lineas = wrapTextoNativo(fontRegular, 11, valorTexto, NATIVO_CONTENT_W);
    const altoNecesario = 14 + lineas.length * 14 + 12;
    if (espacioDisponible() < altoNecesario) nuevaPagina(false);

    ctx.page.drawText(campo.etiqueta, {
      x: NATIVO_MARGIN, y: ctx.y, size: 9, font: fontBold, color: NATIVO_GRAY_TEXT,
    });
    ctx.y -= 14;
    for (const linea of lineas) {
      ctx.page.drawText(linea, {
        x: NATIVO_MARGIN, y: ctx.y, size: 11, font: fontRegular, color: NATIVO_BLACK,
      });
      ctx.y -= 14;
    }
    ctx.y -= 12;
  }
```

- [ ] **Step 3: Verificar con script ad-hoc incluyendo grilla y sección**

```js
// soporte-ti-istho/server/tmp-verificar-pdf-nativo-2.js
const fs = require('fs');
const { generarPdfNativo } = require('./src/services/pdfService');

async function main() {
  const buffer = await generarPdfNativo({
    formulario: { nombre: 'Inspección de vehículo' },
    respuesta: { id: 7, createdAt: new Date() },
    nombreRespondente: 'Carlos Técnico',
    respuestaCampos: [
      { campoId: 1, valor: 'ABC-123' },
      {
        campoId: 2,
        valor: JSON.stringify([
          { fila: 0, columna: 'B', observacion: '' },
          { fila: 1, columna: 'M', observacion: 'Revisar en próximo mantenimiento' },
        ]),
      },
    ],
    campos: [
      { id: 1, etiqueta: 'Placa', tipo: 'texto_corto', orden: 0, seccionId: 10 },
      {
        id: 2, etiqueta: 'Checklist', tipo: 'grilla', orden: 1, seccionId: 10,
        opciones: { columnas: ['B', 'R', 'M', 'N/A'], filas: ['Fugas de aceite', 'Batería en buen estado'], conObservaciones: true },
      },
    ],
    secciones: [{ id: 10, nombre: 'Datos del vehículo', visibleParaUsuario: true }],
  });
  fs.writeFileSync('tmp-output-2.pdf', buffer);
  console.log('PDF generado:', buffer.length, 'bytes');
}

main().catch((err) => { console.error(err); process.exit(1); });
```

Run: `cd soporte-ti-istho/server && node tmp-verificar-pdf-nativo-2.js`
Expected: imprime `PDF generado: <N> bytes` sin excepción.

Abrir `tmp-output-2.pdf` y verificar visualmente: encabezado de sección "Datos del vehículo" con fondo claro, campo "Placa" como texto normal, tabla de grilla con 2 filas, 4 columnas B/R/M/N-A, la marca navy en la fila/columna correcta (fila 0 → B, fila 1 → M), y la observación de la fila 1 visible en la columna Obs.

- [ ] **Step 4: Limpiar archivos temporales**

```bash
rm soporte-ti-istho/server/tmp-verificar-pdf-nativo-2.js soporte-ti-istho/server/tmp-output-2.pdf
```

Run: `cd soporte-ti-istho && git status --short soporte-ti-istho/server`
Expected: sin archivos `tmp-*` pendientes.

- [ ] **Step 5: Commit**

```bash
git add soporte-ti-istho/server/src/services/pdfService.js
git commit -m "feat: soporte de firma, grilla y secciones en generarPdfNativo"
```

---

### Task 5: Integrar `generarPdfNativo` en `responder()`

**Files:**
- Modify: `soporte-ti-istho/server/src/controllers/formularioRespuestaController.js:11` (import)
- Modify: `soporte-ti-istho/server/src/controllers/formularioRespuestaController.js:151-171` (bloque de generación de PDF)

**Interfaces:**
- Consumes: `generarPdfNativo` de `pdfService.js` (Task 3/4), `_uploadBuffer` (helper ya existente en el mismo archivo, sin cambios), modelo `FormularioPdfGenerado` (Task 2).

- [ ] **Step 1: Actualizar el import de `pdfService`**

En la línea 11, reemplazar:

```js
const { llenarPDF } = require('../services/pdfService');
```

por:

```js
const { llenarPDF, generarPdfNativo } = require('../services/pdfService');
```

- [ ] **Step 2: Reemplazar el bloque de generación de PDF**

Reemplazar (líneas 151-171 actuales):

```js
    let pdfGenerado = null;
    if (formulario.plantillas && formulario.plantillas.length > 0) {
      const plantilla = formulario.plantillas[0];
      try {
        const pdfBuffer = await llenarPDF(plantilla, plantillaMapeos, respuestaCampos, formulario.campos);
        const count = await FormularioPdfGenerado.count({
          include: [{ model: FormularioRespuesta, as: 'respuesta', where: { formularioId: formulario.id }, required: true }],
        });
        const nombreBase = formulario.nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const publicIdBase = `sist-formularios-generados/${nombreBase}_${count + 1}`;
        const uploadResult = await _uploadBuffer(pdfBuffer, publicIdBase, req);
        pdfGenerado = await FormularioPdfGenerado.create({
          respuestaId: respuesta.id,
          plantillaId: plantilla.id,
          urlCloudinary: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        });
      } catch (pdfErr) {
        console.error('Error generando PDF:', pdfErr.message);
      }
    }
```

por:

```js
    let pdfGenerado = null;
    if (formulario.plantillas && formulario.plantillas.length > 0) {
      const plantilla = formulario.plantillas[0];
      try {
        const pdfBuffer = await llenarPDF(plantilla, plantillaMapeos, respuestaCampos, formulario.campos);
        const count = await FormularioPdfGenerado.count({
          include: [{ model: FormularioRespuesta, as: 'respuesta', where: { formularioId: formulario.id }, required: true }],
        });
        const nombreBase = formulario.nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const publicIdBase = `sist-formularios-generados/${nombreBase}_${count + 1}`;
        const uploadResult = await _uploadBuffer(pdfBuffer, publicIdBase, req);
        pdfGenerado = await FormularioPdfGenerado.create({
          respuestaId: respuesta.id,
          plantillaId: plantilla.id,
          tipo: 'plantilla',
          urlCloudinary: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        });
      } catch (pdfErr) {
        console.error('Error generando PDF:', pdfErr.message);
      }
    } else {
      try {
        const nombreParaPdf = req.user?.nombre || respuesta.nombreRespondente || null;
        const pdfBuffer = await generarPdfNativo({
          formulario, respuesta, respuestaCampos,
          campos: formulario.campos, secciones: formulario.secciones,
          nombreRespondente: nombreParaPdf,
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

- [ ] **Step 3: Verificar que el servidor arranca y la ruta responde**

Run: `cd soporte-ti-istho/server && npm run dev` (en background, dejar corriendo)

En otra terminal, confirmar que el proceso levantó sin errores de sintaxis:
Run: `curl -s http://localhost:5000/api/health`
Expected: respuesta JSON de éxito (confirma que `app.js` cargó todas las rutas y controladores sin fallar al hacer `require`).

Detener el servidor (`Ctrl+C` o matar el proceso) una vez confirmado.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/server/src/controllers/formularioRespuestaController.js
git commit -m "feat: generar PDF nativo al responder formularios sin plantilla"
```

---

### Task 6: Incluir `tipo` en los endpoints de listado y detalle de respuestas

Los dos endpoints que devuelven el PDF asociado a una respuesta restringen explícitamente los `attributes` del include — sin este cambio, el campo `tipo` nunca llega al frontend aunque exista en el modelo y en la BD.

**Files:**
- Modify: `soporte-ti-istho/server/src/controllers/formularioRespuestaController.js` (función `listarRespuestasFormulario`)
- Modify: `soporte-ti-istho/server/src/controllers/formularioRespuestaController.js` (función `obtenerDetalleRespuesta`)

**Interfaces:**
- Produces: el JSON de `GET /formularios/:id/respuestas` y `GET /formularios/respuestas/:id/detalle` incluye `pdf.tipo` (`'plantilla' | 'nativo'`) además de `pdf.id` y `pdf.urlCloudinary` — consumido por las Tasks 7 y 8 en frontend.

- [ ] **Step 1: Actualizar `attributes` en `listarRespuestasFormulario`**

Dentro de esa función, reemplazar:

```js
    const include = [
      { model: FormularioPdfGenerado, as: 'pdf', attributes: ['id', 'urlCloudinary'] },
      { model: Usuario, as: 'respondedor', attributes: ['id', 'nombre'] },
    ];
```

por:

```js
    const include = [
      { model: FormularioPdfGenerado, as: 'pdf', attributes: ['id', 'urlCloudinary', 'tipo'] },
      { model: Usuario, as: 'respondedor', attributes: ['id', 'nombre'] },
    ];
```

- [ ] **Step 2: Actualizar `attributes` en `obtenerDetalleRespuesta`**

Dentro de esa función, reemplazar:

```js
    const respuesta = await FormularioRespuesta.findByPk(req.params.id, {
      include: [
        { model: FormularioPdfGenerado, as: 'pdf', attributes: ['id', 'urlCloudinary'] },
        { model: Usuario, as: 'respondedor', attributes: ['id', 'nombre'] },
      ],
    });
```

por:

```js
    const respuesta = await FormularioRespuesta.findByPk(req.params.id, {
      include: [
        { model: FormularioPdfGenerado, as: 'pdf', attributes: ['id', 'urlCloudinary', 'tipo'] },
        { model: Usuario, as: 'respondedor', attributes: ['id', 'nombre'] },
      ],
    });
```

- [ ] **Step 3: Verificar con una consulta directa**

Run: `cd soporte-ti-istho/server && node -e "const {FormularioPdfGenerado} = require('./src/models'); FormularioPdfGenerado.findOne({attributes: ['id','urlCloudinary','tipo']}).then(r => console.log(r ? r.toJSON() : 'sin registros')).finally(() => process.exit())"`
Expected: si hay al menos un registro, imprime un objeto con la clave `tipo` presente (valor `'plantilla'` para los registros preexistentes). Si la tabla está vacía, imprime `'sin registros'` — no es un error, solo confirma que la consulta con `attributes` incluyendo `tipo` no lanza excepción.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/server/src/controllers/formularioRespuestaController.js
git commit -m "fix: incluir tipo de PDF en respuestas de listado y detalle"
```

---

### Task 7: Badge "Plantilla"/"Generado" en `FormularioRespuestasPage.jsx`

**Files:**
- Modify: `soporte-ti-istho/client/src/pages/FormularioRespuestasPage.jsx`

**Interfaces:**
- Consumes: `Badge` de `../components/common/Badge` (ya importado en el archivo), `r.pdf.tipo` del payload de `listarRespuestasFormulario` (Task 6).

- [ ] **Step 1: Agregar el mapeo de etiqueta/variante**

Después de la función `formatFecha` (línea 17), agregar:

```js
const PDF_TIPO_LABEL = { plantilla: 'Plantilla', nativo: 'Generado' };
const PDF_TIPO_VARIANT = { plantilla: 'default', nativo: 'info' };
```

- [ ] **Step 2: Mostrar el badge junto al botón de descarga**

Reemplazar (dentro del `<td>` de Acciones, líneas 222-234):

```jsx
                      <div className="flex items-center justify-end gap-2">
                        {r.pdf?.urlCloudinary && (
                          <button
                            onClick={() => descargar(r)}
                            disabled={descargando === r.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors disabled:opacity-50"
                          >
                            {descargando === r.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Download className="w-3.5 h-3.5" />}
                            PDF
                          </button>
                        )}
```

por:

```jsx
                      <div className="flex items-center justify-end gap-2">
                        {r.pdf?.urlCloudinary && (
                          <>
                            <Badge variant={PDF_TIPO_VARIANT[r.pdf.tipo] ?? 'default'}>
                              {PDF_TIPO_LABEL[r.pdf.tipo] ?? 'PDF'}
                            </Badge>
                            <button
                              onClick={() => descargar(r)}
                              disabled={descargando === r.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors disabled:opacity-50"
                            >
                              {descargando === r.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
                              PDF
                            </button>
                          </>
                        )}
```

- [ ] **Step 3: Verificar que el frontend compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores de sintaxis ni de ESLint bloqueante.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/client/src/pages/FormularioRespuestasPage.jsx
git commit -m "feat: badge de tipo de PDF en tabla de respuestas"
```

---

### Task 8: Badge "Plantilla"/"Generado" en `RespuestaDetalleModal.jsx`

**Files:**
- Modify: `soporte-ti-istho/client/src/components/formularios/RespuestaDetalleModal.jsx`

**Interfaces:**
- Consumes: `Badge` (ya importado), `data.respuesta.pdf.tipo` del payload de `obtenerDetalleRespuesta` (Task 6).

- [ ] **Step 1: Agregar el mapeo de etiqueta/variante**

Después de la función `formatFecha` (línea 12), agregar:

```js
const PDF_TIPO_LABEL = { plantilla: 'Plantilla', nativo: 'Generado' };
const PDF_TIPO_VARIANT = { plantilla: 'default', nativo: 'info' };
```

- [ ] **Step 2: Agregar el bloque de badge en la meta info**

Reemplazar (bloque de meta info, líneas 44-59):

```jsx
          <div className="flex flex-wrap gap-3 pb-4 border-b border-slate-200 dark:border-navy-600">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Respondido por</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{resolverNombre(data.respuesta)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Fecha</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{formatFecha(data.respuesta.createdAt ?? data.respuesta.created_at)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Estado</span>
              <Badge variant={data.respuesta.estado === 'completado' ? 'success' : 'warning'}>
                {data.respuesta.estado === 'completado' ? 'Completado' : 'Pendiente'}
              </Badge>
            </div>
          </div>
```

por:

```jsx
          <div className="flex flex-wrap gap-3 pb-4 border-b border-slate-200 dark:border-navy-600">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Respondido por</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{resolverNombre(data.respuesta)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Fecha</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{formatFecha(data.respuesta.createdAt ?? data.respuesta.created_at)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Estado</span>
              <Badge variant={data.respuesta.estado === 'completado' ? 'success' : 'warning'}>
                {data.respuesta.estado === 'completado' ? 'Completado' : 'Pendiente'}
              </Badge>
            </div>
            {data.respuesta.pdf?.urlCloudinary && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-400 uppercase font-semibold">PDF</span>
                <Badge variant={PDF_TIPO_VARIANT[data.respuesta.pdf.tipo] ?? 'default'}>
                  {PDF_TIPO_LABEL[data.respuesta.pdf.tipo] ?? 'PDF'}
                </Badge>
              </div>
            )}
          </div>
```

- [ ] **Step 3: Verificar que el frontend compila**

Run: `cd soporte-ti-istho/client && npm run build`
Expected: build termina sin errores.

- [ ] **Step 4: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/RespuestaDetalleModal.jsx
git commit -m "feat: badge de tipo de PDF en modal de detalle de respuesta"
```

---

### Task 9: Verificación end-to-end manual

Confirma el flujo completo con datos reales: un formulario sin plantilla, respondido, genera su PDF nativo automáticamente y el badge se ve correctamente en ambas vistas.

**Files:** ninguno (solo verificación manual vía UI/API)

- [ ] **Step 1: Levantar backend y frontend**

Run: `cd soporte-ti-istho/server && npm run dev` (background)
Run: `cd soporte-ti-istho/client && npm run dev` (background)

- [ ] **Step 2: Crear un formulario sin plantilla PDF**

En el navegador, ir a `http://localhost:5173/formularios/nuevo` (sesión admin o técnico), crear un formulario con 2-3 campos (ej. `texto_corto`, `seleccion_unica`), guardarlo, **sin** subir ninguna plantilla PDF en la pestaña "PDF & Mapeo", y activarlo.

- [ ] **Step 3: Responder el formulario**

Ir a `/formularios/:id/responder`, llenar los campos, enviar. Verificar que aparece `PDFSuccessModal` con botón de descarga (confirma que `pdfGenerado` no fue `null`).

- [ ] **Step 4: Verificar el PDF descargado**

Descargar el PDF desde el modal de éxito. Abrirlo y confirmar visualmente: cabecera navy con logo, nombre del formulario, folio `FORM-######`, fecha, respondente, los campos respondidos con su etiqueta/valor, y el pie de página institucional.

- [ ] **Step 5: Verificar el badge en `FormularioRespuestasPage`**

Ir a `/formularios/:id/respuestas`. Confirmar que la fila de la respuesta recién creada muestra el badge **"Generado"** junto al botón de descarga PDF.

- [ ] **Step 6: Verificar el badge en `RespuestaDetalleModal`**

Hacer clic en "Ver detalle" sobre esa misma respuesta. Confirmar que el bloque de meta info muestra el badge **"Generado"** junto a Respondido por / Fecha / Estado.

- [ ] **Step 7: Confirmar que el flujo con plantilla sigue intacto (regresión)**

Repetir los pasos 2-6 sobre un formulario **que sí tenga** una plantilla PDF mapeada (o usar uno existente, ej. el formulario de inspección de vehículos del seeder). Confirmar que el PDF generado sigue siendo el de la plantilla (no el nativo) y que el badge muestra **"Plantilla"** en ambas vistas.

- [ ] **Step 8: Detener los servidores de desarrollo**

Cerrar ambos procesos (`Ctrl+C`).
