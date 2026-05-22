const { PDFDocument } = require('pdf-lib');
const cloudinary = require('../config/cloudinary');
const multerUpload = require('../config/multer');
const {
  Formulario, FormularioCampo, FormularioPdfPlantilla,
  FormularioPdfMapeo, Usuario,
} = require('../models');
const { registrarAuditoria } = require('../services/auditoriaService');
const { ROLES } = require('../utils/constants');

async function listar(req, res, next) {
  try {
    const where = { activo: true };
    if (req.user.rol === ROLES.TECNICO) where.creadoPor = req.user.id;
    const rows = await Formulario.findAll({
      where,
      include: [{ model: Usuario, as: 'creador', attributes: ['id', 'nombre'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, descripcion, acceso } = req.body;
    const formulario = await Formulario.create({
      nombre, descripcion, acceso: acceso || 'autenticado', creadoPor: req.user.id,
    });
    await registrarAuditoria({
      tabla: 'formularios', registro_id: formulario.id, operacion: 'CREATE',
      datos_nuevos: formulario.toJSON(), usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.get('User-Agent'),
    });
    res.status(201).json({ success: true, data: formulario });
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const formulario = await Formulario.findByPk(req.params.id, {
      include: [
        { model: FormularioCampo, as: 'campos', order: [['orden', 'ASC']] },
        {
          model: FormularioPdfPlantilla, as: 'plantillas',
          include: [{ model: FormularioPdfMapeo, as: 'mapeos' }],
          order: [['createdAt', 'DESC']],
          limit: 1,
        },
      ],
    });
    if (!formulario) return res.status(404).json({ success: false, message: 'Formulario no encontrado' });
    res.json({ success: true, data: formulario });
  } catch (err) { next(err); }
}

async function obtenerPublico(req, res, next) {
  try {
    const formulario = await Formulario.findOne({
      where: { id: req.params.id, acceso: 'publico', activo: true },
      include: [{ model: FormularioCampo, as: 'campos', order: [['orden', 'ASC']] }],
    });
    if (!formulario) return res.status(404).json({ success: false, message: 'Formulario no disponible' });
    res.json({ success: true, data: formulario });
  } catch (err) { next(err); }
}

async function listarDisponibles(req, res, next) {
  try {
    const where = { activo: true };
    if (!req.user) {
      where.acceso = 'publico';
    }
    const rows = await Formulario.findAll({
      where,
      include: [
        { model: FormularioPdfPlantilla, as: 'plantillas', attributes: ['id'], limit: 1, order: [['createdAt', 'DESC']] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const formulario = await Formulario.findByPk(req.params.id);
    if (!formulario) return res.status(404).json({ success: false, message: 'No encontrado' });
    const anterior = formulario.toJSON();
    const { nombre, descripcion, acceso, activo } = req.body;
    await formulario.update({ nombre, descripcion, acceso, activo });
    await registrarAuditoria({
      tabla: 'formularios', registro_id: formulario.id, operacion: 'UPDATE',
      datos_anteriores: anterior, datos_nuevos: formulario.toJSON(),
      usuario_id: req.user.id, ip_address: req.ip, user_agent: req.get('User-Agent'),
    });
    res.json({ success: true, data: formulario });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const formulario = await Formulario.findByPk(req.params.id);
    if (!formulario) return res.status(404).json({ success: false, message: 'No encontrado' });
    const anterior = formulario.toJSON();
    await formulario.destroy();
    await registrarAuditoria({
      tabla: 'formularios', registro_id: req.params.id, operacion: 'DELETE',
      datos_anteriores: anterior, usuario_id: req.user.id,
      ip_address: req.ip, user_agent: req.get('User-Agent'),
    });
    res.json({ success: true, message: 'Formulario eliminado' });
  } catch (err) { next(err); }
}

async function guardarCampos(req, res, next) {
  try {
    const { campos } = req.body; // [{ tipo, etiqueta, descripcion, placeholder, requerido, opciones }]
    if (!Array.isArray(campos)) return res.status(400).json({ success: false, message: 'campos debe ser array' });

    await FormularioCampo.destroy({ where: { formularioId: req.params.id } });
    const creados = await FormularioCampo.bulkCreate(
      campos.map((c, i) => ({ ...c, formularioId: parseInt(req.params.id), orden: i }))
    );
    res.json({ success: true, data: creados });
  } catch (err) { next(err); }
}

async function subirPlantilla(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo requerido' });

    // Detect AcroForm
    const fileBuffer = await _descargarBuffer(req.file.path || req.file.secure_url || req.file.url);
    const pdfDoc = await PDFDocument.load(fileBuffer).catch(() => null);
    let tieneAcroform = false;
    let camposPDF = [];
    if (pdfDoc) {
      try {
        const fields = pdfDoc.getForm().getFields();
        tieneAcroform = fields.length > 0;
        camposPDF = fields.map(f => f.getName());
      } catch { /* no form */ }
    }

    const plantilla = await FormularioPdfPlantilla.create({
      formularioId: req.params.id,
      nombre: req.file.originalname || req.file.filename,
      urlCloudinary: req.file.secure_url || req.file.path,
      publicId: req.file.public_id || req.file.filename,
      tieneAcroform,
    });

    res.status(201).json({ success: true, data: { plantilla, camposPDF } });
  } catch (err) { next(err); }
}

async function _descargarBuffer(url) {
  if (url.startsWith('http')) {
    const axios = require('axios');
    const r = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(r.data);
  }
  return require('fs').promises.readFile(url);
}

async function guardarMapeos(req, res, next) {
  try {
    const formulario = await Formulario.findByPk(req.params.id, {
      include: [{ model: FormularioPdfPlantilla, as: 'plantillas', order: [['createdAt', 'DESC']], limit: 1 }],
    });
    if (!formulario || !formulario.plantillas.length) {
      return res.status(404).json({ success: false, message: 'Sin plantilla activa' });
    }
    const plantilla = formulario.plantillas[0];
    const { mapeos } = req.body; // [{ campoId, pdfCampoNombre?, pagina?, posX?, posY?, ancho? }]

    await FormularioPdfMapeo.destroy({ where: { plantillaId: plantilla.id } });
    if (mapeos && mapeos.length) {
      await FormularioPdfMapeo.bulkCreate(
        mapeos.map(m => ({ ...m, plantillaId: plantilla.id }))
      );
    }
    const actualizados = await FormularioPdfMapeo.findAll({ where: { plantillaId: plantilla.id } });
    res.json({ success: true, data: actualizados });
  } catch (err) { next(err); }
}

module.exports = { listar, crear, obtener, obtenerPublico, listarDisponibles, actualizar, eliminar, guardarCampos, subirPlantilla, guardarMapeos };
