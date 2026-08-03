const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const axios = require('axios');
const { descargarBuffer: cloudinaryDescargar } = require('../config/cloudinary');
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

// pdf-lib's standard fonts (Helvetica) only support the WinAnsi character set.
// Any character outside \x00-\xFF (emoji, CJK, etc.) throws inside drawText/
// widthOfTextAtSize. This is a conservative Latin-1 approximation of WinAnsi —
// good enough to eliminate the crash for realistic input without a full cp1252 table.
function sanitizarTextoPdf(texto) {
  return String(texto).replace(/[^\x00-\xFF]/g, '?');
}

function partirPalabraLarga(font, size, palabra, maxWidth) {
  const chunks = [];
  let actual = '';
  for (const ch of palabra) {
    const prueba = actual + ch;
    if (actual && font.widthOfTextAtSize(prueba, size) > maxWidth) {
      chunks.push(actual);
      actual = ch;
    } else {
      actual = prueba;
    }
  }
  if (actual) chunks.push(actual);
  return chunks;
}

function wrapTextoNativo(font, size, texto, maxWidth) {
  const textoSanitizado = sanitizarTextoPdf(texto);
  const lineas = [];
  for (const lineaOriginal of textoSanitizado.split('\n')) {
    const palabras = lineaOriginal.split(/\s+/).filter((p) => p.length > 0);
    if (palabras.length === 0) {
      lineas.push('');
      continue;
    }
    let actual = '';
    for (const palabra of palabras) {
      if (font.widthOfTextAtSize(palabra, size) > maxWidth) {
        // Palabra individual no cabe ni en una línea vacía: partir por caracteres
        if (actual) {
          lineas.push(actual);
          actual = '';
        }
        const chunks = partirPalabraLarga(font, size, palabra, maxWidth);
        for (let i = 0; i < chunks.length - 1; i++) lineas.push(chunks[i]);
        actual = chunks[chunks.length - 1] || '';
        continue;
      }
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (actual && font.widthOfTextAtSize(prueba, size) > maxWidth) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    if (actual) lineas.push(actual);
  }
  return lineas;
}

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function aplicarTransformTexto(valor, transform) {
  if (!transform || transform === 'ninguno') return valor;
  const s = String(valor);
  if (transform === 'mayusculas') return s.toUpperCase();
  if (transform === 'minusculas') return s.toLowerCase();
  if (transform === 'capitalizar') {
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

function aplicarFormatoFecha(valor, formatoFecha) {
  if (!formatoFecha || formatoFecha === 'completa') return valor;
  // Soporta YYYY-MM-DD o DD/MM/YYYY
  let anio, mes, dia;
  const isoMatch = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmyMatch = String(valor).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (isoMatch) {
    [, anio, mes, dia] = isoMatch;
  } else if (dmyMatch) {
    [, dia, mes, anio] = dmyMatch;
  } else {
    return valor;
  }
  if (formatoFecha === 'dia') return String(parseInt(dia));
  if (formatoFecha === 'mes') return String(parseInt(mes));
  if (formatoFecha === 'mes_nombre') return MESES_ES[parseInt(mes) - 1] || mes;
  if (formatoFecha === 'anio') return anio;
  return valor;
}

async function llenarPDF(plantilla, mapeos, respuestaCampos, campos = []) {
  const pdfBytes = await cloudinaryDescargar(plantilla.publicId, plantilla.urlCloudinary);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const campoMap = {};
  for (const rc of respuestaCampos) campoMap[rc.campoId] = rc;

  const campoOpcionesMap = {};
  for (const campo of campos) {
    campoOpcionesMap[campo.id] = { opciones: campo.opciones, tipo: campo.tipo };
  }

  console.log(`[pdfService] mapeos=${mapeos.length}, respuestaCampos=${respuestaCampos.length}`);
  console.log('[pdfService] campoMap keys:', Object.keys(campoMap));
  console.log('[pdfService] mapeo campoIds:', mapeos.map(m => m.campoId));

  if (plantilla.tieneAcroform) {
    const form = pdfDoc.getForm();
    for (const mapeo of mapeos) {
      const rc = campoMap[mapeo.campoId];
      if (!rc || !mapeo.pdfCampoNombre) continue;
      try {
        const field = form.getTextField(mapeo.pdfCampoNombre);
        field.setText(rc.valor || '');
      } catch {
        // field type incompatible — skip
      }
    }
    form.flatten();
  } else {
    const pages = pdfDoc.getPages();

    // Precarga de fuentes necesarias según los mapeos (evita re-embed por cada campo)
    const fontCache = new Map();
    async function getFont(familia, negrita, cursiva) {
      const key = `${familia}-${negrita}-${cursiva}`;
      if (fontCache.has(key)) return fontCache.get(key);
      const FONT_MAP = {
        'Helvetica-false-false':  StandardFonts.Helvetica,
        'Helvetica-true-false':   StandardFonts.HelveticaBold,
        'Helvetica-false-true':   StandardFonts.HelveticaOblique,
        'Helvetica-true-true':    StandardFonts.HelveticaBoldOblique,
        'TimesRoman-false-false': StandardFonts.TimesRoman,
        'TimesRoman-true-false':  StandardFonts.TimesBold,
        'TimesRoman-false-true':  StandardFonts.TimesItalic,
        'TimesRoman-true-true':   StandardFonts.TimesBoldItalic,
        'Courier-false-false':    StandardFonts.Courier,
        'Courier-true-false':     StandardFonts.CourierBold,
        'Courier-false-true':     StandardFonts.CourierOblique,
        'Courier-true-true':      StandardFonts.CourierBoldOblique,
      };
      const stdFont = FONT_MAP[key] || StandardFonts.Helvetica;
      const font = await pdfDoc.embedFont(stdFont);
      fontCache.set(key, font);
      return font;
    }

    function hexToRgb(hex) {
      const h = (hex || '#000000').replace('#', '');
      return rgb(
        parseInt(h.substring(0, 2), 16) / 255,
        parseInt(h.substring(2, 4), 16) / 255,
        parseInt(h.substring(4, 6), 16) / 255,
      );
    }

    for (const mapeo of mapeos) {
      const rc = campoMap[mapeo.campoId];
      if (!rc) {
        console.log(`[pdfService] skip campoId=${mapeo.campoId} — sin valor en respuesta`);
        continue;
      }
      if (mapeo.pagina == null) {
        console.log(`[pdfService] skip campoId=${mapeo.campoId} — pagina es null`);
        continue;
      }
      const page = pages[Number(mapeo.pagina) - 1];
      if (!page) continue;
      const { width, height } = page.getSize();

      const chipAncho = mapeo.ancho || 20;
      const chipAlto = mapeo.alto || 5;
      const xLeft = ((mapeo.posX - chipAncho / 2) / 100) * width;
      const yCentro = height - (mapeo.posY / 100) * height;

      // Detectar si el valor es una grilla
      let grillaData = null;
      if (campoOpcionesMap[mapeo.campoId]?.tipo === 'grilla' && rc.valor) {
        try {
          const parsed = JSON.parse(rc.valor);
          if (Array.isArray(parsed)) grillaData = parsed;
        } catch { /* no es JSON */ }
      }

      if (rc.archivoUrl) {
        try {
          const imgResp = await axios.get(rc.archivoUrl, { responseType: 'arraybuffer' });
          const pngImage = await pdfDoc.embedPng(imgResp.data);
          const drawWidth = (chipAncho / 100) * width;
          const drawHeight = (chipAlto / 100) * height;
          page.drawImage(pngImage, {
            x: xLeft,
            y: yCentro - drawHeight / 2,
            width: drawWidth,
            height: drawHeight,
          });
        } catch (imgErr) {
          console.warn(`[pdfService] imagen fallo campoId=${mapeo.campoId}:`, imgErr.message);
        }
      } else if (grillaData) {
        const rawOpts = campoOpcionesMap[mapeo.campoId]?.opciones;
        const opts = rawOpts && typeof rawOpts === 'object'
          ? rawOpts
          : (typeof rawOpts === 'string' ? (() => { try { return JSON.parse(rawOpts); } catch { return {}; } })() : {});
        const filasLabels = Array.isArray(opts.filas) ? opts.filas : [];
        const columnas = Array.isArray(opts.columnas) ? opts.columnas : ['B', 'R', 'M', 'N/A'];
        const conObs = Boolean(opts.conObservaciones);

        const requestedSize = Math.max(Number(mapeo.fontTamano) || 7, 5);
        const familia = mapeo.fontFamilia || 'Helvetica';
        const fontN = await getFont(familia, false, false);
        const fontB = await getFont(familia, true, false);

        const tableW = (chipAncho / 100) * width;
        const tableH = (chipAlto / 100) * height;
        const yTop = yCentro + tableH / 2;
        const tableAreaBottom = yTop - tableH;

        const totalRows = filasLabels.length + 1;
        const rowH = Math.max(Math.min(tableH / totalRows, 18), requestedSize + 3);
        const fontSize = Math.min(requestedSize, Math.max(rowH - 2, 5));

        // Columna mínima para que quepa el header más ancho
        let minColW = 14;
        try {
          minColW = Math.max(...columnas.map(c => fontB.widthOfTextAtSize(String(c), fontSize) + 6));
        } catch { /* fallback */ }
        const obsW = conObs ? Math.min(tableW * 0.2, 70) : 0;
        const colW = Math.max(Math.min(tableW * 0.12, 36), minColW);
        const labelW = Math.max(tableW - columnas.length * colW - obsW, 30);

        // Área de columnas (B/R/M/N/A + Obs.) — la columna Item la provee el template impreso
        const checkX = xLeft + labelW;
        const checkW = tableW - labelW;

        // Fondo blanco solo sobre las columnas de selección (no tapa la columna Item del template)
        page.drawRectangle({ x: checkX, y: tableAreaBottom, width: checkW, height: tableH, color: rgb(1, 1, 1) });

        function truncText(text, font, maxW, size) {
          try {
            let t = String(text);
            if (font.widthOfTextAtSize(t, size) <= maxW) return t;
            while (t.length > 1 && font.widthOfTextAtSize(t + '...', size) > maxW) t = t.slice(0, -1);
            return t + '...';
          } catch {
            const maxChars = Math.floor(maxW / (size * 0.55));
            const s = String(text);
            return s.length <= maxChars ? s : s.slice(0, Math.max(maxChars - 3, 1)) + '...';
          }
        }

        const black     = rgb(0, 0, 0);
        const navy      = rgb(0.13, 0.29, 0.53);
        const grayLight = rgb(0.96, 0.96, 0.96);
        const grayMid   = rgb(0.82, 0.82, 0.82);
        const grayLine  = rgb(0.65, 0.65, 0.65);

        // Header (solo columnas de selección — sin encabezado "Item")
        page.drawRectangle({ x: checkX, y: yTop - rowH, width: checkW, height: rowH, color: grayMid });
        const hTextY = yTop - rowH + (rowH - fontSize) / 2;
        for (let c = 0; c < columnas.length; c++) {
          const cx = xLeft + labelW + c * colW;
          const txt = truncText(String(columnas[c]), fontB, colW - 2, fontSize);
          try {
            const tw = fontB.widthOfTextAtSize(txt, fontSize);
            page.drawText(txt, { x: cx + (colW - tw) / 2, y: hTextY, size: fontSize, font: fontB, color: black });
          } catch { /* skip non-encodable */ }
        }
        if (conObs) {
          page.drawText('Obs.', { x: xLeft + labelW + columnas.length * colW + 2, y: hTextY, size: Math.max(fontSize - 1, 5), font: fontB, color: black });
        }

        // Data rows
        let rowsDrawn = 0;
        for (let i = 0; i < filasLabels.length; i++) {
          const yRow = yTop - rowH * (i + 2);
          if (yRow < yCentro - tableH / 2) break;
          rowsDrawn++;

          const entry = grillaData.find(e => Number(e.fila) === i) || { fila: i, columna: null };
          const rowTextSize = Math.max(fontSize - 1, 5);
          const rowTextY = yRow + (rowH - rowTextSize) / 2;

          // Banda alternada solo sobre columnas de selección
          if (i % 2 === 0) {
            page.drawRectangle({ x: checkX, y: yRow, width: checkW, height: rowH, color: grayLight });
          }

          // Marcas de selección B/R/M/N/A
          for (let c = 0; c < columnas.length; c++) {
            if (entry.columna === columnas[c]) {
              const cx = xLeft + labelW + c * colW;
              const pad = 2;
              page.drawRectangle({ x: cx + pad, y: yRow + pad, width: colW - pad * 2, height: rowH - pad * 2, color: navy });
            }
          }

          if (conObs && entry.observacion) {
            const obsX = xLeft + labelW + columnas.length * colW;
            const obsTxt = truncText(String(entry.observacion), fontN, obsW - 4, rowTextSize);
            try {
              page.drawText(obsTxt, { x: obsX + 2, y: rowTextY, size: rowTextSize, font: fontN, color: black });
            } catch { /* skip non-encodable */ }
          }

          // Separador de fila solo sobre columnas de selección
          page.drawLine({ start: { x: checkX, y: yRow }, end: { x: xLeft + tableW, y: yRow }, thickness: 0.3, color: grayLine });
        }

        // Grid borders (solo sobre columnas de selección)
        const tableBottom = yTop - rowH * (rowsDrawn + 1);
        page.drawLine({ start: { x: checkX, y: yTop }, end: { x: xLeft + tableW, y: yTop }, thickness: 0.5, color: grayLine });
        page.drawLine({ start: { x: checkX, y: tableBottom }, end: { x: xLeft + tableW, y: tableBottom }, thickness: 0.5, color: grayLine });
        page.drawLine({ start: { x: checkX, y: yTop }, end: { x: checkX, y: tableBottom }, thickness: 0.5, color: grayLine });
        page.drawLine({ start: { x: xLeft + tableW, y: yTop }, end: { x: xLeft + tableW, y: tableBottom }, thickness: 0.5, color: grayLine });
        page.drawLine({ start: { x: checkX, y: yTop - rowH }, end: { x: xLeft + tableW, y: yTop - rowH }, thickness: 0.5, color: grayLine });
        for (let c = 1; c < columnas.length; c++) {
          const cx = xLeft + labelW + c * colW;
          page.drawLine({ start: { x: cx, y: yTop }, end: { x: cx, y: tableBottom }, thickness: 0.3, color: grayLine });
        }
        if (conObs) {
          const obsX = xLeft + labelW + columnas.length * colW;
          page.drawLine({ start: { x: obsX, y: yTop }, end: { x: obsX, y: tableBottom }, thickness: 0.4, color: grayLine });
        }
      } else if (rc.valor) {
        const fontSize = Number(mapeo.fontTamano) || 10;
        const familia = mapeo.fontFamilia || 'Helvetica';
        const negrita = Boolean(mapeo.fontNegrita);
        const cursiva = Boolean(mapeo.fontCursiva);
        const color = hexToRgb(mapeo.fontColor);
        const font = await getFont(familia, negrita, cursiva);
        const textoConFecha = aplicarFormatoFecha(rc.valor, mapeo.formatoFecha);
        const textoFinal = aplicarTransformTexto(textoConFecha, mapeo.transformTexto);
        try {
          page.drawText(String(textoFinal), {
            x: xLeft,
            y: yCentro,
            size: fontSize,
            font,
            color,
          });
        } catch (textErr) {
          console.warn(`[pdfService] drawText fallo campoId=${mapeo.campoId} valor="${rc.valor}":`, textErr.message);
        }
      }
    }
  }

  return Buffer.from(await pdfDoc.save());
}

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

  ctx.page.drawText(sanitizarTextoPdf(campo.etiqueta), {
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
    const colTexto = sanitizarTextoPdf(col);
    const cx = NATIVO_MARGIN + labelW + c * colW;
    const tw = fontBold.widthOfTextAtSize(colTexto, 8);
    ctx.page.drawText(colTexto, {
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
    const filaLabelSan = sanitizarTextoPdf(filaLabel);
    const filaLabelTexto = filaLabelSan.length > 45 ? `${filaLabelSan.slice(0, 42)}...` : filaLabelSan;
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
      const obsSan = sanitizarTextoPdf(entry.observacion);
      const obsTexto = obsSan.length > 22 ? `${obsSan.slice(0, 19)}...` : obsSan;
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

async function generarPdfNativo({ formulario, respuesta, respuestaCampos, campos, secciones = [], nombreRespondente }) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await pdfDoc.embedPng(fs.readFileSync(NATIVO_LOGO_PATH));

  const folio = `FORM-${String(respuesta.id).padStart(6, '0')}`;
  const fechaTexto = new Date(respuesta.createdAt || Date.now()).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const nombreFormularioTexto = sanitizarTextoPdf(formulario.nombre);
  const nombreMostrado = sanitizarTextoPdf(nombreRespondente || 'Anónimo');

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
      ctx.page.drawText(nombreFormularioTexto, {
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
      const encabezado = `${nombreFormularioTexto}  ·  ${folio}`;
      ctx.page.drawText(encabezado, {
        x: NATIVO_MARGIN, y: ctx.y, size: 10, font: fontBold, color: NATIVO_GRAY_TEXT,
      });
      ctx.y -= 20;
    }
  }

  nuevaPagina(true);

  const campoMap = new Map(respuestaCampos.map((rc) => [rc.campoId, rc]));
  const camposConRespuesta = campos.filter((c) => campoMap.has(c.id));

  const seccionMap = new Map((secciones || []).map((s) => [s.id, s]));

  // Agrupar campos replicando exactamente el algoritmo de
  // client/src/components/formularios/FormularioRenderer.jsx (líneas 68-99):
  // 1) una entrada por cada sección visible (en el orden del array `secciones`,
  //    sin reordenar), con sus campos ordenados por `orden`.
  // 2) un único grupo (sin encabezado) con todos los campos de secciones NO visibles.
  // 3) un único grupo (sin encabezado) con los campos sin sección o con seccionId huérfano.
  const grupos = [];

  const seccionesConHeader = (secciones || []).filter((s) => s.visibleParaUsuario);
  for (const seccion of seccionesConHeader) {
    const secCampos = camposConRespuesta
      .filter((c) => c.seccionId === seccion.id)
      .sort((a, b) => a.orden - b.orden);
    if (secCampos.length > 0) {
      grupos.push({ tipo: 'visible', seccion, campos: secCampos });
    }
  }

  const seccionesOcultas = (secciones || []).filter((s) => !s.visibleParaUsuario);
  const camposOcultos = camposConRespuesta
    .filter((c) => c.seccionId && seccionesOcultas.some((s) => s.id === c.seccionId))
    .sort((a, b) => a.orden - b.orden);
  if (camposOcultos.length > 0) {
    grupos.push({ tipo: 'oculto', campos: camposOcultos });
  }

  const camposSinSeccion = camposConRespuesta
    .filter((c) => !c.seccionId || !seccionMap.has(c.seccionId))
    .sort((a, b) => a.orden - b.orden);
  if (camposSinSeccion.length > 0) {
    grupos.push({ tipo: 'sin_seccion', campos: camposSinSeccion });
  }

  for (const grupo of grupos) {
    if (grupo.tipo === 'visible') {
      if (espacioDisponible() < 30) nuevaPagina(false);
      ctx.page.drawRectangle({
        x: NATIVO_MARGIN, y: ctx.y - 18, width: NATIVO_CONTENT_W, height: 20, color: rgb(0.93, 0.94, 0.97),
      });
      ctx.page.drawText(sanitizarTextoPdf(grupo.seccion.nombre), {
        x: NATIVO_MARGIN + 6, y: ctx.y - 13, size: 10, font: fontBold, color: NATIVO_NAVY,
      });
      ctx.y -= 30;
    }

    for (const campo of grupo.campos) {
      const rc = campoMap.get(campo.id);

      if (campo.tipo === 'firma' && rc.archivoUrl) {
        if (espacioDisponible() < 80) nuevaPagina(false);
        ctx.page.drawText(sanitizarTextoPdf(campo.etiqueta), {
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

      const valorTexto = (rc.valor && rc.valor.trim()) || 'Sin respuesta';
      const lineas = wrapTextoNativo(fontRegular, 11, valorTexto, NATIVO_CONTENT_W);
      const altoNecesario = 14 + lineas.length * 14 + 12;
      if (espacioDisponible() < altoNecesario) nuevaPagina(false);

      ctx.page.drawText(sanitizarTextoPdf(campo.etiqueta), {
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

module.exports = { llenarPDF, generarPdfNativo };
