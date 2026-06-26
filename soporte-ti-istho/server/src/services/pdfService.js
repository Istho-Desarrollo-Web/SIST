const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const axios = require('axios');
const { descargarBuffer: cloudinaryDescargar } = require('../config/cloudinary');

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

module.exports = { llenarPDF };
