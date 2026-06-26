const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('../config/cloudinary');
const {
  Formulario, FormularioCampo, FormularioSeccion, FormularioPdfPlantilla,
  FormularioPdfMapeo, FormularioRespuesta, RespuestaCampo,
  FormularioPdfGenerado, Usuario, Solicitud,
} = require('../models');
const { registrarAuditoria } = require('../services/auditoriaService');
const { llenarPDF } = require('../services/pdfService');
const { ROLES } = require('../utils/constants');
const { Op } = require('sequelize');

function evaluarCondicion(condicion, valores) {
  if (!condicion || !condicion.reglas || condicion.reglas.length === 0) return true;
  const resultados = condicion.reglas.map(regla => {
    const val = valores[regla.campoId] ?? valores[String(regla.campoId)];
    const str = Array.isArray(val) ? val.join(', ') : String(val ?? '');
    const reglVal = String(regla.valor ?? '');
    switch (regla.operador) {
      case 'igual':         return Array.isArray(val) ? val.includes(regla.valor) : str === reglVal;
      case 'diferente':     return Array.isArray(val) ? !val.includes(regla.valor) : str !== reglVal;
      case 'contiene':      return Array.isArray(val) ? val.includes(regla.valor) : str.includes(reglVal);
      case 'no_contiene':   return Array.isArray(val) ? !val.includes(regla.valor) : !str.includes(reglVal);
      case 'esta_vacio':    return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
      case 'no_esta_vacio': return val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
      default: return true;
    }
  });
  return condicion.operadorLogico === 'O' ? resultados.some(Boolean) : resultados.every(Boolean);
}

async function responder(req, res, next) {
  try {
    const formulario = await Formulario.findOne({
      where: { id: req.params.id, activo: true },
      include: [
        { model: FormularioCampo, as: 'campos' },
        { model: FormularioSeccion, as: 'secciones' },
        {
          model: FormularioPdfPlantilla, as: 'plantillas',
          order: [['created_at', 'DESC']],
          limit: 1,
        },
      ],
    });
    if (!formulario) return res.status(404).json({ success: false, message: 'Formulario no encontrado' });
    if (formulario.acceso === 'autenticado' && !req.user) {
      return res.status(401).json({ success: false, message: 'Autenticación requerida' });
    }

    // Buscar mapeos en query separada para evitar el LIMIT 1 anidado de Sequelize
    let plantillaMapeos = [];
    if (formulario.plantillas && formulario.plantillas.length > 0) {
      plantillaMapeos = await FormularioPdfMapeo.findAll({
        where: { plantillaId: formulario.plantillas[0].id },
      });
    }

    const respuesta = await FormularioRespuesta.create({
      formularioId: formulario.id,
      respondidoPor: req.user?.id || null,
      ipRespondente: req.ip,
      estado: 'pendiente',
      nombreRespondente: (!req.user && req.body.nombreRespondente)
        ? String(req.body.nombreRespondente).slice(0, 200)
        : null,
    });

    const { campos: valoresCampos = {} } = req.body;

    // Determinar secciones visibles
    const seccionesVisiblesSet = new Set(
      (formulario.secciones || [])
        .filter(s => !s.condiciones || evaluarCondicion(s.condiciones, valoresCampos))
        .map(s => s.id)
    );

    // Determinar campos visibles
    const camposVisiblesSet = new Set(
      formulario.campos.filter(campo => {
        if (campo.seccionId && !seccionesVisiblesSet.has(campo.seccionId)) return false;
        return !campo.condiciones || evaluarCondicion(campo.condiciones, valoresCampos);
      }).map(c => c.id)
    );

    // Validar campos requeridos visibles
    for (const campo of formulario.campos) {
      if (!camposVisiblesSet.has(campo.id) || !campo.requerido) continue;
      const valor = valoresCampos[campo.id];
      const estaVacio = valor === undefined || valor === null || valor === ''
        || (Array.isArray(valor) && valor.length === 0);
      if (estaVacio) {
        return res.status(400).json({
          success: false,
          message: `El campo "${campo.etiqueta}" es requerido`,
        });
      }
      if (campo.tipo === 'grilla' && !estaVacio && campo.requerido) {
        const opciones = campo.opciones && typeof campo.opciones === 'object' ? campo.opciones : {};
        const filas = Array.isArray(opciones.filas) ? opciones.filas : [];
        if (filas.length > 0) {
          const incompleto = filas.some((_, idx) => {
            const entry = valor.find(e => e.fila === idx);
            return !entry || !entry.columna;
          });
          if (incompleto) {
            return res.status(400).json({
              success: false,
              message: `El campo "${campo.etiqueta}" requiere selección en todas las filas`,
            });
          }
        }
      }
    }

    const respuestaCamposData = [];

    for (const campo of formulario.campos) {
      if (!camposVisiblesSet.has(campo.id)) continue;
      const valor = valoresCampos[campo.id];
      if (valor !== undefined && valor !== null && valor !== '') {
        if (campo.tipo === 'firma' && typeof valor === 'string' && valor.startsWith('data:image/')) {
          const uploadResult = await _uploadBase64(valor, `sist-firmas/${respuesta.id}`, req);
          respuestaCamposData.push({
            respuestaId: respuesta.id,
            campoId: campo.id,
            archivoUrl: uploadResult.secure_url,
            archivoPublicId: uploadResult.public_id,
          });
        } else if (campo.tipo === 'grilla') {
          respuestaCamposData.push({
            respuestaId: respuesta.id,
            campoId: campo.id,
            valor: JSON.stringify(valor),
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

const HAS_CLOUDINARY = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

function _baseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function _saveLocal(buffer, subdir, ext, name) {
  const dir = path.join(__dirname, '../../uploads', subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${name || uuidv4()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return { filename, localPath: `/uploads/${subdir}/${filename}` };
}

async function _uploadBase64(base64String, folder, req) {
  if (HAS_CLOUDINARY) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(base64String, { folder, resource_type: 'image' }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }
  const data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(data, 'base64');
  const { filename, localPath } = _saveLocal(buffer, 'firmas', '.png');
  return { secure_url: `${_baseUrl(req)}${localPath}`, public_id: filename };
}

async function _uploadBuffer(buffer, publicIdPrefix, req) {
  if (HAS_CLOUDINARY) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'sist-formularios-generados', resource_type: 'raw', format: 'pdf', public_id: publicIdPrefix },
        (err, result) => { if (err) return reject(err); resolve(result); }
      );
      stream.end(buffer);
    });
  }
  const safeName = publicIdPrefix.split('/').pop();
  const { filename, localPath } = _saveLocal(buffer, 'formularios', '.pdf', safeName);
  return { secure_url: `${_baseUrl(req)}${localPath}`, public_id: safeName };
}

async function listarPdfs(req, res, next) {
  try {
    const where = {};
    if (req.user.rol === ROLES.USUARIO) where.respondidoPor = req.user.id;

    const rows = await FormularioRespuesta.findAll({
      where: { ...where, estado: 'completado' },
      include: [
        { model: Formulario, as: 'formulario', attributes: ['id', 'nombre'] },
        { model: FormularioPdfGenerado, as: 'pdf' },
        { model: Usuario, as: 'respondedor', attributes: ['id', 'nombre'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function eliminarPdf(req, res, next) {
  try {
    const pdf = await FormularioPdfGenerado.findByPk(req.params.id, {
      include: [{ model: FormularioRespuesta, as: 'respuesta' }],
    });
    if (!pdf) return res.status(404).json({ success: false, message: 'PDF no encontrado' });
    if (req.user.rol === ROLES.USUARIO && pdf.respuesta?.respondidoPor !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Sin permiso' });
    }
    if (HAS_CLOUDINARY && pdf.publicId) {
      try {
        await new Promise((resolve, reject) => {
          cloudinary.uploader.destroy(pdf.publicId, { resource_type: 'raw' }, (err, r) => {
            if (err) return reject(err);
            resolve(r);
          });
        });
      } catch { /* continuar aunque falle la eliminación en Cloudinary */ }
    }
    await pdf.destroy();
    res.json({ success: true });
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
    const { descargarBuffer } = require('../config/cloudinary');
    const buffer = await descargarBuffer(respuesta.pdf.publicId || null, respuesta.pdf.urlCloudinary);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="formulario-${req.params.id}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
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

async function listarRespuestasFormulario(req, res, next) {
  try {
    const formulario = await Formulario.findByPk(req.params.id, {
      attributes: ['id', 'nombre'],
    });
    if (!formulario) return res.status(404).json({ success: false, message: 'Formulario no encontrado' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = { formularioId: req.params.id };
    if (req.user.rol === ROLES.USUARIO) where.respondidoPor = req.user.id;

    if (req.query.desde || req.query.hasta) {
      where.createdAt = {};
      if (req.query.desde) where.createdAt[Op.gte] = new Date(req.query.desde);
      if (req.query.hasta) {
        const hasta = new Date(req.query.hasta);
        hasta.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = hasta;
      }
    }

    const include = [
      { model: FormularioPdfGenerado, as: 'pdf', attributes: ['id', 'urlCloudinary'] },
      { model: Usuario, as: 'respondedor', attributes: ['id', 'nombre'] },
    ];

    let rows, count;

    if (req.query.buscar) {
      const all = await FormularioRespuesta.findAll({ where, include, order: [['created_at', 'DESC']] });
      const buscar = req.query.buscar.toLowerCase();
      const filtered = all.filter((r) => {
        const nombre = r.respondedor?.nombre || r.nombreRespondente || '';
        return nombre.toLowerCase().includes(buscar);
      });
      count = filtered.length;
      rows = filtered.slice(offset, offset + limit);
    } else {
      ({ rows, count } = await FormularioRespuesta.findAndCountAll({
        where,
        include,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        distinct: true,
      }));
    }

    res.json({
      success: true,
      data: {
        formulario: { id: formulario.id, nombre: formulario.nombre },
        respuestas: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) { next(err); }
}

async function obtenerDetalleRespuesta(req, res, next) {
  try {
    const respuesta = await FormularioRespuesta.findByPk(req.params.id, {
      include: [
        { model: FormularioPdfGenerado, as: 'pdf', attributes: ['id', 'urlCloudinary'] },
        { model: Usuario, as: 'respondedor', attributes: ['id', 'nombre'] },
      ],
    });
    if (!respuesta) return res.status(404).json({ success: false, message: 'Respuesta no encontrada' });
    if (req.user.rol === ROLES.USUARIO && respuesta.respondidoPor !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Sin permiso' });
    }

    const respuestaCampos = await RespuestaCampo.findAll({
      where: { respuestaId: respuesta.id },
    });
    const campos = await FormularioCampo.findAll({
      where: { formularioId: respuesta.formularioId },
      order: [['orden', 'ASC']],
    });

    const respuestaCamposMap = new Map(respuestaCampos.map((rc) => [rc.campoId, rc]));
    const camposDetalle = campos.map((c) => {
      const rc = respuestaCamposMap.get(c.id);
      return {
        etiqueta: c.etiqueta,
        tipo: c.tipo,
        valor: rc?.valor ?? null,
        archivoUrl: rc?.archivoUrl ?? null,
      };
    });

    res.json({
      success: true,
      data: {
        respuesta: {
          id: respuesta.id,
          estado: respuesta.estado,
          createdAt: respuesta.createdAt,
          respondedor: respuesta.respondedor,
          nombreRespondente: respuesta.nombreRespondente,
          pdf: respuesta.pdf,
        },
        campos: camposDetalle,
      },
    });
  } catch (err) { next(err); }
}

module.exports = { responder, listarPdfs, descargarPdf, eliminarPdf, asociarSolicitud, listarRespuestasFormulario, obtenerDetalleRespuesta };
