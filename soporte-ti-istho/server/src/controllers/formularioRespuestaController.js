const cloudinary = require('../config/cloudinary');
const {
  Formulario, FormularioCampo, FormularioPdfPlantilla,
  FormularioPdfMapeo, FormularioRespuesta, RespuestaCampo,
  FormularioPdfGenerado, Usuario, Solicitud,
} = require('../models');
const { registrarAuditoria } = require('../services/auditoriaService');
const { llenarPDF } = require('../services/pdfService');
const { ROLES } = require('../utils/constants');

async function responder(req, res, next) {
  try {
    const formulario = await Formulario.findOne({
      where: { id: req.params.id, activo: true },
      include: [
        { model: FormularioCampo, as: 'campos' },
        {
          model: FormularioPdfPlantilla, as: 'plantillas',
          include: [{ model: FormularioPdfMapeo, as: 'mapeos' }],
          order: [['createdAt', 'DESC']],
          limit: 1,
        },
      ],
    });
    if (!formulario) return res.status(404).json({ success: false, message: 'Formulario no encontrado' });
    if (formulario.acceso === 'autenticado' && !req.user) {
      return res.status(401).json({ success: false, message: 'Autenticación requerida' });
    }

    const respuesta = await FormularioRespuesta.create({
      formularioId: formulario.id,
      respondidoPor: req.user?.id || null,
      ipRespondente: req.ip,
      estado: 'pendiente',
    });

    const { campos: valoresCampos = {} } = req.body;
    const respuestaCamposData = [];

    for (const campo of formulario.campos) {
      const valor = valoresCampos[campo.id];
      if (valor !== undefined && valor !== null && valor !== '') {
        // If base64 (firma), upload to Cloudinary
        if (campo.tipo === 'firma' && typeof valor === 'string' && valor.startsWith('data:image/')) {
          const uploadResult = await _uploadBase64(valor, `sist-firmas/${respuesta.id}`);
          respuestaCamposData.push({
            respuestaId: respuesta.id,
            campoId: campo.id,
            archivoUrl: uploadResult.secure_url,
            archivoPublicId: uploadResult.public_id,
          });
        } else {
          respuestaCamposData.push({
            respuestaId: respuesta.id,
            campoId: campo.id,
            valor: Array.isArray(valor) ? valor.join(', ') : String(valor),
          });
        }
      }
    }

    await RespuestaCampo.bulkCreate(respuestaCamposData);
    const respuestaCampos = await RespuestaCampo.findAll({ where: { respuestaId: respuesta.id } });

    let pdfGenerado = null;
    if (formulario.plantillas && formulario.plantillas.length > 0) {
      const plantilla = formulario.plantillas[0];
      try {
        const pdfBuffer = await llenarPDF(plantilla, plantilla.mapeos, respuestaCampos);
        const uploadResult = await _uploadBuffer(pdfBuffer, `sist-formularios-generados/respuesta-${respuesta.id}`);
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

    await respuesta.update({ estado: 'completado' });
    await registrarAuditoria({
      tabla: 'formulario_respuestas', registro_id: respuesta.id, operacion: 'CREATE',
      datos_nuevos: { formularioId: formulario.id, respondidoPor: req.user?.id },
      usuario_id: req.user?.id || null, ip_address: req.ip, user_agent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      data: {
        respuesta,
        pdfGenerado,
      },
    });
  } catch (err) { next(err); }
}

async function _uploadBase64(base64String, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(base64String, { folder, resource_type: 'image' }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

async function _uploadBuffer(buffer, publicIdPrefix) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'sist-formularios-generados', resource_type: 'raw', format: 'pdf', public_id: publicIdPrefix },
      (err, result) => { if (err) return reject(err); resolve(result); }
    );
    stream.end(buffer);
  });
}

async function listarPdfs(req, res, next) {
  try {
    const where = {};
    if (req.user.rol === ROLES.USUARIO) where.respondidoPor = req.user.id;

    const rows = await FormularioRespuesta.findAll({
      where: { ...where, estado: 'completado' },
      include: [
        { model: Formulario, as: 'formulario', attributes: ['id', 'nombre'] },
        { model: FormularioPdfGenerado, as: 'pdf', attributes: ['id', 'urlCloudinary', 'createdAt'] },
        { model: Usuario, as: 'respondedor', attributes: ['id', 'nombre'], foreignKey: 'respondido_por' },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function descargarPdf(req, res, next) {
  try {
    const respuesta = await FormularioRespuesta.findByPk(req.params.id, {
      include: [{ model: FormularioPdfGenerado, as: 'pdf' }],
    });
    if (!respuesta || !respuesta.pdf) {
      return res.status(404).json({ success: false, message: 'PDF no encontrado' });
    }
    if (req.user.rol === ROLES.USUARIO && respuesta.respondidoPor !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Sin permiso' });
    }
    res.redirect(respuesta.pdf.urlCloudinary);
  } catch (err) { next(err); }
}

async function asociarSolicitud(req, res, next) {
  try {
    const respuesta = await FormularioRespuesta.findByPk(req.params.id);
    if (!respuesta) return res.status(404).json({ success: false, message: 'No encontrado' });
    const { solicitudId } = req.body;
    await respuesta.update({ solicitudId });
    res.json({ success: true, data: respuesta });
  } catch (err) { next(err); }
}

module.exports = { responder, listarPdfs, descargarPdf, asociarSolicitud };
