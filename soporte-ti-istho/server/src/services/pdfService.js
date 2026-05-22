const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const axios = require('axios');

async function llenarPDF(plantilla, mapeos, respuestaCampos) {
  const resp = await axios.get(plantilla.urlCloudinary, { responseType: 'arraybuffer' });
  const pdfDoc = await PDFDocument.load(resp.data);

  const campoMap = {};
  for (const rc of respuestaCampos) campoMap[rc.campoId] = rc;

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
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    for (const mapeo of mapeos) {
      const rc = campoMap[mapeo.campoId];
      if (!rc || mapeo.pagina == null) continue;
      const page = pages[mapeo.pagina - 1];
      if (!page) continue;
      const { width, height } = page.getSize();

      if (rc.archivoUrl) {
        try {
          const imgResp = await axios.get(rc.archivoUrl, { responseType: 'arraybuffer' });
          const pngImage = await pdfDoc.embedPng(imgResp.data);
          const drawWidth = ((mapeo.ancho || 20) / 100) * width;
          const drawHeight = drawWidth * 0.4;
          page.drawImage(pngImage, {
            x: (mapeo.posX / 100) * width,
            y: height - (mapeo.posY / 100) * height - drawHeight,
            width: drawWidth,
            height: drawHeight,
          });
        } catch {
          // skip if image fails
        }
      } else if (rc.valor) {
        page.drawText(String(rc.valor), {
          x: (mapeo.posX / 100) * width,
          y: height - (mapeo.posY / 100) * height,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  return Buffer.from(await pdfDoc.save());
}

module.exports = { llenarPDF };
