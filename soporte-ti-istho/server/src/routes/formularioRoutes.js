const router = require('express').Router();
const multerUpload = require('../config/multer');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const fc = require('../controllers/formularioController');
const fr = require('../controllers/formularioRespuestaController');
const { ROLES } = require('../utils/constants');

// Rutas estáticas primero
router.get('/disponibles', auth.optional, fc.listarDisponibles);

router.get('/pdfs', auth, fr.listarPdfs);
router.delete('/pdfs/:id', auth, authorize(ROLES.ADMIN), fr.eliminarPdf);

// Vista pública/autenticada para rellenar (opcional auth)
router.get('/:id/vista', auth.optional, fc.obtenerVista);

// CRUD formularios
router.get('/', auth, authorize(ROLES.ADMIN, ROLES.TECNICO), fc.listar);
router.post('/', auth, authorize(ROLES.ADMIN, ROLES.TECNICO), fc.crear);
router.get('/:id', auth, authorize(ROLES.ADMIN, ROLES.TECNICO), fc.obtener);
router.get('/:id/publica', fc.obtenerPublico);
router.put('/:id', auth, authorize(ROLES.ADMIN, ROLES.TECNICO), fc.actualizar);
router.delete('/:id', auth, authorize(ROLES.ADMIN), fc.eliminar);

// Campos
router.post('/:id/campos', auth, authorize(ROLES.ADMIN, ROLES.TECNICO), fc.guardarCampos);

// Plantilla PDF
router.post('/:id/plantilla', auth, authorize(ROLES.ADMIN, ROLES.TECNICO),
  multerUpload.single('archivo'), fc.subirPlantilla);

// Proxy plantilla PDF (evita restricciones CDN de Cloudinary en el navegador)
router.get('/:id/plantilla/proxy', auth, fc.proxyPlantillaPdf);

// Mapeos
router.post('/:id/mapeos', auth, authorize(ROLES.ADMIN, ROLES.TECNICO), fc.guardarMapeos);

// Responder formulario (puede ser sin auth si es público — el controller valida)
router.post('/:id/responder', auth.optional, fr.responder);

// Export Excel de respuestas — ANTES de /:id/respuestas
router.get('/:id/respuestas/export', auth, fr.exportarRespuestas);

// Listado de respuestas por formulario
router.get('/:id/respuestas', auth, fr.listarRespuestasFormulario);

// PDF de respuesta
router.get('/respuestas/:id/pdf', auth, fr.descargarPdf);
router.put('/respuestas/:id/solicitud', auth, authorize(ROLES.ADMIN, ROLES.TECNICO), fr.asociarSolicitud);

// Detalle de campos de una respuesta específica
router.get('/respuestas/:id/detalle', auth, fr.obtenerDetalleRespuesta);

module.exports = router;
