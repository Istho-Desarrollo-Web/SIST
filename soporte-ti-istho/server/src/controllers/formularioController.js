const { PDFDocument } = require('pdf-lib');
const cloudinary = require('../config/cloudinary');
const multerUpload = require('../config/multer');
const {
  Formulario, FormularioCampo, FormularioSeccion,
  FormularioPdfPlantilla, FormularioPdfMapeo, Usuario,
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
      order: [['created_at', 'DESC']],
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
        { model: FormularioSeccion, as: 'secciones', order: [['orden', 'ASC']] },
        {
          model: FormularioPdfPlantilla, as: 'plantillas',
          order: [['created_at', 'DESC']],
          limit: 1,
        },
      ],
    });
    if (!formulario) return res.status(404).json({ success: false, message: 'Formulario no encontrado' });

    if (formulario.plantillas && formulario.plantillas.length > 0) {
      const mapeos = await FormularioPdfMapeo.findAll({
        where: { plantillaId: formulario.plantillas[0].id },
      });
      formulario.plantillas[0].setDataValue('mapeos', mapeos);
    }

    res.json({ success: true, data: formulario });
  } catch (err) { next(err); }
}

async function obtenerPublico(req, res, next) {
  try {
    const formulario = await Formulario.findOne({
      where: { id: req.params.id, acceso: 'publico', activo: true },
      include: [
        { model: FormularioCampo, as: 'campos', order: [['orden', 'ASC']] },
        { model: FormularioSeccion, as: 'secciones', order: [['orden', 'ASC']] },
      ],
    });
    if (!formulario) return res.status(404).json({ success: false, message: 'Formulario no disponible' });
    res.json({ success: true, data: formulario });
  } catch (err) { next(err); }
}

async function obtenerVista(req, res, next) {
  try {
    const formulario = await Formulario.findOne({
      where: { id: req.params.id, activo: true },
      include: [
        { model: FormularioCampo, as: 'campos', order: [['orden', 'ASC']] },
        { model: FormularioSeccion, as: 'secciones', order: [['orden', 'ASC']] },
      ],
    });
    if (!formulario) return res.status(404).json({ success: false, message: 'Formulario no disponible' });
    if (formulario.acceso === 'autenticado' && !req.user) {
      return res.status(401).json({ success: false, message: 'Autenticación requerida' });
    }
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
        { model: FormularioPdfPlantilla, as: 'plantillas', attributes: ['id'], limit: 1, order: [['created_at', 'DESC']] },
      ],
      order: [['created_at', 'DESC']],
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
  const sequelize = require('../config/database');
  const t = await sequelize.transaction();
  try {
    const { campos, secciones = [] } = req.body;
    if (!Array.isArray(campos)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'campos debe ser array' });
    }

    const formularioId = parseInt(req.params.id);

    // ── Upsert secciones ──────────────────────────────────────────────────
    const existentesSecciones = await FormularioSeccion.findAll({
      where: { formularioId }, attributes: ['id'], transaction: t,
    });
    const idsSeccionesExistentes = existentesSecciones.map(s => s.id);
    const idsSeccionesEnviadas = secciones.filter(s => s.id).map(s => parseInt(s.id));
    const seccionIdsAEliminar = idsSeccionesExistentes.filter(id => !idsSeccionesEnviadas.includes(id));
    if (seccionIdsAEliminar.length) {
      await FormularioSeccion.destroy({ where: { id: seccionIdsAEliminar }, transaction: t });
    }

    const keyToIdMap = new Map();
    const seccionResults = [];
    for (const sec of secciones) {
      const data = {
        formularioId,
        nombre: sec.nombre,
        orden: sec.orden,
        visibleParaUsuario: Boolean(sec.visibleParaUsuario),
      };
      let saved;
      if (sec.id) {
        await FormularioSeccion.update(data, { where: { id: sec.id, formularioId }, transaction: t });
        saved = await FormularioSeccion.findByPk(sec.id, { transaction: t });
      } else {
        saved = await FormularioSeccion.create(data, { transaction: t });
      }
      if (sec._key) keyToIdMap.set(sec._key, saved.id);
      seccionResults.push({ ...saved.toJSON(), _key: sec._key || null });
    }

    // ── Upsert campos ─────────────────────────────────────────────────────
    const existentes = await FormularioCampo.findAll({ where: { formularioId }, attributes: ['id'], transaction: t });
    const idsExistentes = existentes.map(c => c.id);
    const idsEnviados = campos.filter(c => c.id).map(c => parseInt(c.id));
    const idsAEliminar = idsExistentes.filter(id => !idsEnviados.includes(id));
    if (idsAEliminar.length) {
      await FormularioCampo.destroy({ where: { id: idsAEliminar }, transaction: t });
    }

    const resultados = await Promise.all(
      campos.map(async ({ _key, _seccionKey, id, ...c }, i) => {
        const resolvedSeccionId = _seccionKey
          ? (keyToIdMap.get(_seccionKey) || c.seccionId || null)
          : (c.seccionId || null);

        const data = {
          ...c,
          formularioId,
          orden: i,
          seccionId: resolvedSeccionId,
          opciones: (() => {
            if (Array.isArray(c.opciones)) return c.opciones;
            if (!c.opciones) return null;
            try { return JSON.parse(c.opciones); }
            catch { return null; }
          })(),
        };
        const parsedId = id ? parseInt(id) : null;
        if (parsedId && idsEnviados.includes(parsedId)) {
          await FormularioCampo.update(data, { where: { id: parsedId, formularioId }, transaction: t });
          return FormularioCampo.findByPk(parsedId, { transaction: t });
        }
        return FormularioCampo.create(data, { transaction: t });
      })
    );

    await t.commit();
    res.json({ success: true, data: { secciones: seccionResults, campos: resultados } });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

function _resolverUrlArchivo(req) {
  // Cloudinary storage: secure_url es una URL https://
  if (req.file.secure_url) return req.file.secure_url;
  // Disk storage: path es ruta absoluta → convertir a URL HTTP del servidor
  const filename = req.file.filename;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/solicitudes/${filename}`;
}

async function subirPlantilla(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Archivo requerido' });

    const urlArchivo = _resolverUrlArchivo(req);
    // Detect AcroForm
    const fileBuffer = await _descargarBuffer(req.file.path || urlArchivo);
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
      urlCloudinary: urlArchivo,
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
    const plantilla = await FormularioPdfPlantilla.findOne({
      where: { formularioId: req.params.id },
      order: [['created_at', 'DESC']],
    });
    if (!plantilla) {
      return res.status(404).json({ success: false, message: 'Sin plantilla activa' });
    }
    const { mapeos } = req.body;

    // Validar antes de destruir para no perder datos si hay error
    if (mapeos && mapeos.length) {
      const sinCampoId = mapeos.filter(m => m.campoId == null).length;
      if (sinCampoId > 0) {
        return res.status(400).json({ success: false, message: `${sinCampoId} mapeo(s) sin campoId — guardá los campos primero` });
      }
    }

    await FormularioPdfMapeo.destroy({ where: { plantillaId: plantilla.id } });
    if (mapeos && mapeos.length) {
      // Strip id para que MySQL asigne PKs nuevas sin conflictos
      await FormularioPdfMapeo.bulkCreate(
        mapeos.map(({ id: _id, plantillaId: _pid, ...m }) => ({ ...m, plantillaId: plantilla.id })),
      );
    }
    const actualizados = await FormularioPdfMapeo.findAll({ where: { plantillaId: plantilla.id } });
    console.log(`[guardarMapeos] formularioId=${req.params.id} plantillaId=${plantilla.id} guardados=${actualizados.length}`);
    res.json({ success: true, data: actualizados });
  } catch (err) { next(err); }
}

module.exports = { listar, crear, obtener, obtenerPublico, obtenerVista, listarDisponibles, actualizar, eliminar, guardarCampos, subirPlantilla, guardarMapeos };
