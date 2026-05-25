const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const axios = require('axios');

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

async function llenarPDF(plantilla, mapeos, respuestaCampos) {
  const resp = await axios.get(plantilla.urlCloudinary, { responseType: 'arraybuffer' });
  const pdfDoc = await PDFDocument.load(resp.data);

  const campoMap = {};
  for (const rc of respuestaCampos) campoMap[rc.campoId] = rc;

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
