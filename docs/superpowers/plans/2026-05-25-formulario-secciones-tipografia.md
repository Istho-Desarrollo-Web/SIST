# Formulario Builder — Secciones y Tipografía PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar secciones colapsables con toggle de visibilidad en el builder de formularios, y personalización tipográfica (fuente, negrita, cursiva, color) en el inspector del PDFMapper.

**Architecture:** Dos features independientes implementadas en secuencia. Feature 1 (Secciones) agrega `formulario_secciones` como entidad nueva, extiende `formulario_campos` con `seccion_id`, y modifica el builder para multi-container DnD. Feature 2 (Tipografía) agrega 4 columnas a `formulario_pdf_mapeos`, extiende el inspector del PDFMapper, y actualiza `pdfService.js` para usar `StandardFonts` variables.

**Tech Stack:** React 19 + Tailwind v4 + Lucide React + @dnd-kit/core + @dnd-kit/sortable, Node/Express + Sequelize 6 + MySQL 8, pdf-lib (StandardFonts). Colores custom en Tailwind: `navy-*`, `orange-*`, `cgreen-*`. NO emojis — solo iconos Lucide.

---

## Estructura de archivos

| Archivo | Acción |
|---------|--------|
| `server/src/migrations/20260525000013-add-secciones-formulario.js` | CREAR |
| `server/src/migrations/20260525000014-add-tipografia-pdf-mapeos.js` | CREAR |
| `server/src/models/FormularioSeccion.js` | CREAR |
| `server/src/models/FormularioCampo.js` | MODIFICAR (agregar `seccionId`) |
| `server/src/models/index.js` | MODIFICAR (registrar FormularioSeccion + asociaciones) |
| `server/src/models/FormularioPdfMapeo.js` | MODIFICAR (4 columnas tipografía) |
| `server/src/controllers/formularioController.js` | MODIFICAR (guardarCampos + GET) |
| `server/src/services/pdfService.js` | MODIFICAR (StandardFonts + color) |
| `client/src/components/formularios/SeccionItem.jsx` | CREAR |
| `client/src/components/formularios/CamposList.jsx` | MODIFICAR (multi-container DnD) |
| `client/src/pages/FormularioBuilderPage.jsx` | MODIFICAR (estado secciones) |
| `client/src/services/formulariosApi.js` | MODIFICAR (guardarCampos con secciones) |
| `client/src/components/formularios/PDFMapper.jsx` | MODIFICAR (inspector tipografía) |
| `client/src/components/formularios/FormularioRenderer.jsx` | MODIFICAR (secciones públicas) |

---

## Task 1: Migración — tabla `formulario_secciones` y columna `seccion_id`

**Files:**
- Create: `server/src/migrations/20260525000013-add-secciones-formulario.js`

- [ ] **Step 1: Crear el archivo de migración**

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla formulario_secciones
    await queryInterface.createTable('formulario_secciones', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      formulario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'formularios', key: 'id' },
        onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      visible_para_usuario: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('formulario_secciones', ['formulario_id']);

    // Agregar columna seccion_id a formulario_campos
    await queryInterface.addColumn('formulario_campos', 'seccion_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: { model: 'formulario_secciones', key: 'id' },
      onDelete: 'SET NULL',
      after: 'formulario_id',
    });
    await queryInterface.addIndex('formulario_campos', ['seccion_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_campos', 'seccion_id');
    await queryInterface.dropTable('formulario_secciones');
  },
};
```

- [ ] **Step 2: Aplicar la migración**

```bash
cd soporte-ti-istho/server
npm run db:migrate
```

Expected output: `== 20260525000013-add-secciones-formulario: migrating =======` seguido de `== 20260525000013-add-secciones-formulario: migrated (Xs)`

- [ ] **Step 3: Verificar en MySQL**

```sql
DESCRIBE formulario_secciones;
DESCRIBE formulario_campos;
```

Expected: `formulario_secciones` existe con 7 columnas. `formulario_campos` tiene columna `seccion_id` nullable.

- [ ] **Step 4: Commit**

```bash
git add server/src/migrations/20260525000013-add-secciones-formulario.js
git commit -m "feat: migration — crear tabla formulario_secciones y columna seccion_id en formulario_campos"
```

---

## Task 2: Migración — columnas tipografía en `formulario_pdf_mapeos`

**Files:**
- Create: `server/src/migrations/20260525000014-add-tipografia-pdf-mapeos.js`

- [ ] **Step 1: Crear el archivo de migración**

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('formulario_pdf_mapeos', 'font_familia', {
      type: Sequelize.ENUM('Helvetica', 'TimesRoman', 'Courier'),
      allowNull: false,
      defaultValue: 'Helvetica',
      after: 'font_tamano',
    });
    await queryInterface.addColumn('formulario_pdf_mapeos', 'font_negrita', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'font_familia',
    });
    await queryInterface.addColumn('formulario_pdf_mapeos', 'font_cursiva', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'font_negrita',
    });
    await queryInterface.addColumn('formulario_pdf_mapeos', 'font_color', {
      type: Sequelize.STRING(7),
      allowNull: false,
      defaultValue: '#000000',
      after: 'font_cursiva',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'font_color');
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'font_cursiva');
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'font_negrita');
    // ENUM requires dropping the type too in MySQL
    await queryInterface.removeColumn('formulario_pdf_mapeos', 'font_familia');
  },
};
```

- [ ] **Step 2: Aplicar la migración**

```bash
cd soporte-ti-istho/server
npm run db:migrate
```

Expected: `== 20260525000014-add-tipografia-pdf-mapeos: migrated`

- [ ] **Step 3: Commit**

```bash
git add server/src/migrations/20260525000014-add-tipografia-pdf-mapeos.js
git commit -m "feat: migration — agregar columnas tipografía (fontFamilia/Negrita/Cursiva/Color) a formulario_pdf_mapeos"
```

---

## Task 3: Modelo `FormularioSeccion`

**Files:**
- Create: `server/src/models/FormularioSeccion.js`

- [ ] **Step 1: Crear el modelo**

```js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioSeccion extends Model {}

FormularioSeccion.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  formularioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'formulario_id',
  },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  visibleParaUsuario: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'visible_para_usuario',
  },
}, {
  sequelize,
  modelName: 'FormularioSeccion',
  tableName: 'formulario_secciones',
  underscored: true,
});

module.exports = FormularioSeccion;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/models/FormularioSeccion.js
git commit -m "feat: modelo FormularioSeccion"
```

---

## Task 4: Actualizar `FormularioCampo` e `index.js`

**Files:**
- Modify: `server/src/models/FormularioCampo.js`
- Modify: `server/src/models/index.js`

- [ ] **Step 1: Agregar `seccionId` a FormularioCampo**

Reemplazar el contenido completo de `server/src/models/FormularioCampo.js`:

```js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioCampo extends Model {}

FormularioCampo.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  formularioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'formulario_id',
  },
  seccionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'seccion_id',
  },
  tipo: {
    type: DataTypes.ENUM(
      'texto_corto', 'texto_largo', 'numero', 'fecha',
      'seleccion_unica', 'seleccion_multiple', 'archivo', 'firma'
    ),
    allowNull: false,
  },
  etiqueta: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  placeholder: { type: DataTypes.STRING(200) },
  requerido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  opciones: { type: DataTypes.JSON },
}, {
  sequelize,
  modelName: 'FormularioCampo',
  tableName: 'formulario_campos',
  underscored: true,
});

module.exports = FormularioCampo;
```

- [ ] **Step 2: Registrar FormularioSeccion y sus asociaciones en `index.js`**

Reemplazar el contenido completo de `server/src/models/index.js`:

```js
const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Empleado = require('./Empleado');
const Solicitud = require('./Solicitud');
const Auditoria = require('./Auditoria');
const Formulario = require('./Formulario');
const FormularioCampo = require('./FormularioCampo');
const FormularioSeccion = require('./FormularioSeccion');
const FormularioPdfPlantilla = require('./FormularioPdfPlantilla');
const FormularioPdfMapeo = require('./FormularioPdfMapeo');
const FormularioRespuesta = require('./FormularioRespuesta');
const RespuestaCampo = require('./RespuestaCampo');
const FormularioPdfGenerado = require('./FormularioPdfGenerado');

// Solicitudes
Empleado.hasMany(Solicitud, { foreignKey: 'empleado_id', as: 'solicitudes' });
Solicitud.belongsTo(Empleado, { foreignKey: 'empleado_id', as: 'empleado' });
Usuario.hasMany(Solicitud, { foreignKey: 'tecnicoAsignado', as: 'ticketsAsignados' });
Solicitud.belongsTo(Usuario, { foreignKey: 'tecnicoAsignado', as: 'tecnico' });
Usuario.hasMany(Auditoria, { foreignKey: 'usuario_id', as: 'auditorias' });
Auditoria.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Formularios
Formulario.belongsTo(Usuario, { foreignKey: 'creado_por', as: 'creador' });
Usuario.hasMany(Formulario, { foreignKey: 'creado_por', as: 'formularios' });

Formulario.hasMany(FormularioCampo, { foreignKey: 'formulario_id', as: 'campos' });
FormularioCampo.belongsTo(Formulario, { foreignKey: 'formulario_id', as: 'formulario' });

Formulario.hasMany(FormularioSeccion, { foreignKey: 'formulario_id', as: 'secciones' });
FormularioSeccion.belongsTo(Formulario, { foreignKey: 'formulario_id', as: 'formulario' });

FormularioSeccion.hasMany(FormularioCampo, { foreignKey: 'seccion_id', as: 'campos' });
FormularioCampo.belongsTo(FormularioSeccion, { foreignKey: 'seccion_id', as: 'seccion' });

Formulario.hasMany(FormularioPdfPlantilla, { foreignKey: 'formulario_id', as: 'plantillas' });
FormularioPdfPlantilla.belongsTo(Formulario, { foreignKey: 'formulario_id', as: 'formulario' });

FormularioPdfPlantilla.hasMany(FormularioPdfMapeo, { foreignKey: 'plantilla_id', as: 'mapeos' });
FormularioPdfMapeo.belongsTo(FormularioPdfPlantilla, { foreignKey: 'plantilla_id', as: 'plantilla' });

FormularioCampo.hasMany(FormularioPdfMapeo, { foreignKey: 'campo_id', as: 'mapeos' });
FormularioPdfMapeo.belongsTo(FormularioCampo, { foreignKey: 'campo_id', as: 'campo' });

Formulario.hasMany(FormularioRespuesta, { foreignKey: 'formulario_id', as: 'respuestas' });
FormularioRespuesta.belongsTo(Formulario, { foreignKey: 'formulario_id', as: 'formulario' });

FormularioRespuesta.hasMany(RespuestaCampo, { foreignKey: 'respuesta_id', as: 'campos' });
RespuestaCampo.belongsTo(FormularioRespuesta, { foreignKey: 'respuesta_id', as: 'respuesta' });

FormularioRespuesta.hasOne(FormularioPdfGenerado, { foreignKey: 'respuesta_id', as: 'pdf' });
FormularioPdfGenerado.belongsTo(FormularioRespuesta, { foreignKey: 'respuesta_id', as: 'respuesta' });

FormularioRespuesta.belongsTo(Usuario, { foreignKey: 'respondido_por', as: 'respondedor' });
Usuario.hasMany(FormularioRespuesta, { foreignKey: 'respondido_por', as: 'respuestasFormularios' });

module.exports = {
  sequelize,
  Usuario, Empleado, Solicitud, Auditoria,
  Formulario, FormularioCampo, FormularioSeccion,
  FormularioPdfPlantilla, FormularioPdfMapeo,
  FormularioRespuesta, RespuestaCampo, FormularioPdfGenerado,
};
```

- [ ] **Step 3: Reiniciar el servidor para verificar que los modelos cargan sin error**

```bash
cd soporte-ti-istho/server
npm run dev
```

Expected: servidor inicia en puerto 5000 sin errores de Sequelize. El log no debe mostrar `SequelizeEagerLoadingError` ni `Unknown column`.

- [ ] **Step 4: Commit**

```bash
git add server/src/models/FormularioCampo.js server/src/models/index.js
git commit -m "feat: agregar seccionId a FormularioCampo y registrar FormularioSeccion en index.js"
```

---

## Task 5: Actualizar `FormularioPdfMapeo` con columnas tipografía

**Files:**
- Modify: `server/src/models/FormularioPdfMapeo.js`

- [ ] **Step 1: Reemplazar el contenido completo del modelo**

```js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FormularioPdfMapeo extends Model {}

FormularioPdfMapeo.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  plantillaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'plantilla_id',
  },
  campoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'campo_id',
  },
  pdfCampoNombre: {
    type: DataTypes.STRING(200),
    field: 'pdf_campo_nombre',
  },
  pagina: { type: DataTypes.INTEGER },
  posX: { type: DataTypes.FLOAT, field: 'pos_x' },
  posY: { type: DataTypes.FLOAT, field: 'pos_y' },
  ancho: { type: DataTypes.FLOAT },
  alto: { type: DataTypes.FLOAT },
  fontTamano: { type: DataTypes.INTEGER, field: 'font_tamano' },
  formatoFecha: { type: DataTypes.STRING(20), field: 'formato_fecha' },
  fontFamilia: {
    type: DataTypes.ENUM('Helvetica', 'TimesRoman', 'Courier'),
    allowNull: false,
    defaultValue: 'Helvetica',
    field: 'font_familia',
  },
  fontNegrita: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'font_negrita',
  },
  fontCursiva: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'font_cursiva',
  },
  fontColor: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#000000',
    field: 'font_color',
  },
}, {
  sequelize,
  modelName: 'FormularioPdfMapeo',
  tableName: 'formulario_pdf_mapeos',
  underscored: true,
});

module.exports = FormularioPdfMapeo;
```

- [ ] **Step 2: Verificar que el servidor sigue iniciando sin errores**

```bash
cd soporte-ti-istho/server
npm run dev
```

Expected: sin errores de Sequelize relacionados con `formulario_pdf_mapeos`.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/FormularioPdfMapeo.js
git commit -m "feat: agregar columnas fontFamilia/Negrita/Cursiva/Color al modelo FormularioPdfMapeo"
```

---

## Task 6: Controlador — `guardarCampos` con secciones + incluir secciones en GET

**Files:**
- Modify: `server/src/controllers/formularioController.js`

El cambio tiene tres partes:
1. `guardarCampos`: recibe `{ campos, secciones }`, hace upsert de secciones, mapea `seccionId` en campos, devuelve `{ secciones, campos }`.
2. `obtener`: incluye secciones en la respuesta del builder.
3. `obtenerVista` y `obtenerPublico`: incluyen secciones para el formulario público.

- [ ] **Step 1: Agregar `FormularioSeccion` al import de modelos**

En la línea 6 de `formularioController.js`, cambiar:

```js
// ANTES
const {
  Formulario, FormularioCampo, FormularioPdfPlantilla,
  FormularioPdfMapeo, Usuario,
} = require('../models');
```

Por:

```js
// DESPUÉS
const {
  Formulario, FormularioCampo, FormularioSeccion,
  FormularioPdfPlantilla, FormularioPdfMapeo, Usuario,
} = require('../models');
```

- [ ] **Step 2: Actualizar la función `obtener` para incluir secciones**

Reemplazar la función `obtener` completa:

```js
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
```

- [ ] **Step 3: Actualizar `obtenerPublico` para incluir secciones**

Reemplazar la función `obtenerPublico` completa:

```js
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
```

- [ ] **Step 4: Actualizar `obtenerVista` para incluir secciones**

Reemplazar la función `obtenerVista` completa:

```js
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
```

- [ ] **Step 5: Reemplazar la función `guardarCampos` completa**

```js
async function guardarCampos(req, res, next) {
  try {
    const { campos, secciones = [] } = req.body;
    if (!Array.isArray(campos)) return res.status(400).json({ success: false, message: 'campos debe ser array' });

    const formularioId = parseInt(req.params.id);

    // ── Upsert secciones ──────────────────────────────────────────────────
    // Eliminar secciones que ya no están en el payload
    const existentesSecciones = await FormularioSeccion.findAll({
      where: { formularioId }, attributes: ['id'],
    });
    const idsSeccionesExistentes = existentesSecciones.map(s => s.id);
    const idsSeccionesEnviadas = secciones.filter(s => s.id).map(s => parseInt(s.id));
    const seccionIdsAEliminar = idsSeccionesExistentes.filter(id => !idsSeccionesEnviadas.includes(id));
    if (seccionIdsAEliminar.length) {
      // ON DELETE SET NULL maneja los campos que apuntan a estas secciones
      await FormularioSeccion.destroy({ where: { id: seccionIdsAEliminar } });
    }

    // Crear/actualizar secciones; construir mapa _key → id para los nuevos
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
        await FormularioSeccion.update(data, { where: { id: sec.id, formularioId } });
        saved = await FormularioSeccion.findByPk(sec.id);
      } else {
        saved = await FormularioSeccion.create(data);
      }
      if (sec._key) keyToIdMap.set(sec._key, saved.id);
      // Echo _key de vuelta para que el cliente pueda reconstruir estado
      seccionResults.push({ ...saved.toJSON(), _key: sec._key || null });
    }

    // ── Upsert campos ─────────────────────────────────────────────────────
    const existentes = await FormularioCampo.findAll({ where: { formularioId }, attributes: ['id'] });
    const idsExistentes = existentes.map(c => c.id);
    const idsEnviados = campos.filter(c => c.id).map(c => parseInt(c.id));
    const idsAEliminar = idsExistentes.filter(id => !idsEnviados.includes(id));
    if (idsAEliminar.length) {
      await FormularioCampo.destroy({ where: { id: idsAEliminar } });
    }

    const resultados = await Promise.all(
      campos.map(async ({ _key, _seccionKey, id, ...c }, i) => {
        // Resolver seccionId: primero por _seccionKey (nuevo), luego por seccionId existente
        const resolvedSeccionId = _seccionKey
          ? (keyToIdMap.get(_seccionKey) || c.seccionId || null)
          : (c.seccionId || null);

        const data = {
          ...c,
          formularioId,
          orden: i,
          seccionId: resolvedSeccionId,
          opciones: Array.isArray(c.opciones)
            ? c.opciones
            : (c.opciones ? JSON.parse(c.opciones) : null),
        };
        const parsedId = id ? parseInt(id) : null;
        if (parsedId && idsEnviados.includes(parsedId)) {
          await FormularioCampo.update(data, { where: { id: parsedId, formularioId } });
          return FormularioCampo.findByPk(parsedId);
        }
        return FormularioCampo.create(data);
      })
    );

    res.json({ success: true, data: { secciones: seccionResults, campos: resultados } });
  } catch (err) { next(err); }
}
```

- [ ] **Step 6: Verificar que el servidor arranca y el endpoint GET /formularios/:id devuelve secciones**

Iniciar servidor y hacer una petición con curl o el navegador:

```bash
cd soporte-ti-istho/server && npm run dev
# En otra terminal:
curl -H "Authorization: Bearer <TOKEN>" http://localhost:5000/api/formularios/1
```

Expected: la respuesta incluye `"secciones": []` en `data`.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/formularioController.js
git commit -m "feat: guardarCampos con upsert secciones + incluir secciones en GET/vista/publica"
```

---

## Task 7: `pdfService.js` — StandardFonts con tipografía variable y color

**Files:**
- Modify: `server/src/services/pdfService.js`

- [ ] **Step 1: Reemplazar el bloque `else` (non-AcroForm) en `llenarPDF`**

El archivo actual tiene en la línea 51: `const font = await pdfDoc.embedFont(StandardFonts.Helvetica);`

Reemplazar **todo el bloque `else { ... }` desde la línea 50 hasta la línea 105** con:

```js
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
        const textoFinal = aplicarFormatoFecha(rc.valor, mapeo.formatoFecha);
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
```

- [ ] **Step 2: Verificar que el servidor reinicia sin errores de sintaxis**

```bash
cd soporte-ti-istho/server && npm run dev
```

Expected: `Server running on port 5000` sin errores de sintaxis en `pdfService.js`.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/pdfService.js
git commit -m "feat: pdfService — StandardFonts variables según fontFamilia/Negrita/Cursiva + color hex"
```

---

## Task 8: Crear `SeccionItem.jsx`

**Files:**
- Create: `client/src/components/formularios/SeccionItem.jsx`

Este componente renderiza el encabezado de una sección en el builder: colapsa/expande, muestra el toggle de visibilidad, y acepta el drop de campos mediante `useDroppable`.

- [ ] **Step 1: Crear el componente**

```jsx
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Pencil, Trash2, Eye, EyeOff, Check, X } from 'lucide-react';

export function SeccionItem({
  seccion,
  campos,
  onRenombrar,
  onToggleVisible,
  onEliminar,
  children,
}) {
  const [expandida, setExpandida] = useState(true);
  const [editando, setEditando] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(seccion.nombre);

  const { setNodeRef, isOver } = useDroppable({ id: `droppable-${seccion._key}` });

  const itemKeys = campos.map(c => c._key);

  function confirmarRenombrar() {
    const nombre = nombreDraft.trim();
    if (nombre) onRenombrar(seccion._key, nombre);
    setEditando(false);
  }

  function cancelarRenombrar() {
    setNombreDraft(seccion.nombre);
    setEditando(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') confirmarRenombrar();
    if (e.key === 'Escape') cancelarRenombrar();
  }

  const headerBg = seccion.visibleParaUsuario
    ? 'bg-navy-700 border-navy-700'
    : 'bg-slate-500 border-slate-400';

  return (
    <div className={`rounded-lg border-2 overflow-hidden ${seccion.visibleParaUsuario ? 'border-navy-700' : 'border-slate-400'}`}>
      {/* Encabezado */}
      <div className={`${headerBg} flex items-center gap-2 px-3 py-2`}>
        {/* Colapsar */}
        <button
          type="button"
          onClick={() => setExpandida(e => !e)}
          className="text-white/70 hover:text-white shrink-0"
        >
          {expandida
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Nombre editable */}
        {editando ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={nombreDraft}
              onChange={e => setNombreDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 px-2 py-0.5 rounded text-sm text-slate-800 bg-white focus:outline-none"
            />
            <button type="button" onClick={confirmarRenombrar} className="text-white/80 hover:text-white">
              <Check className="w-4 h-4" />
            </button>
            <button type="button" onClick={cancelarRenombrar} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="flex-1 text-sm font-semibold text-white truncate">
            {seccion.nombre}
          </span>
        )}

        {/* Toggle visibleParaUsuario */}
        <button
          type="button"
          title={seccion.visibleParaUsuario ? 'Visible para usuario (click para ocultar)' : 'Oculta para usuario (click para mostrar)'}
          onClick={() => onToggleVisible(seccion._key)}
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 bg-white/10 hover:bg-white/20 transition-colors shrink-0"
        >
          <div
            className={`w-6 h-3.5 rounded-full relative transition-colors ${seccion.visibleParaUsuario ? 'bg-cgreen-500' : 'bg-slate-400'}`}
          >
            <div
              className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${seccion.visibleParaUsuario ? 'right-0.5' : 'left-0.5'}`}
            />
          </div>
          {seccion.visibleParaUsuario
            ? <Eye className="w-3 h-3 text-white/80" />
            : <EyeOff className="w-3 h-3 text-white/60" />}
        </button>

        {/* Renombrar */}
        {!editando && (
          <button
            type="button"
            onClick={() => { setNombreDraft(seccion.nombre); setEditando(true); }}
            className="text-white/60 hover:text-white shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Eliminar */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`¿Eliminar la sección "${seccion.nombre}"? Los campos quedarán sin sección.`)) {
              onEliminar(seccion._key);
            }
          }}
          className="text-white/60 hover:text-red-300 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cuerpo — campos */}
      {expandida && (
        <div
          ref={setNodeRef}
          className={`p-2 flex flex-col gap-2 min-h-[40px] bg-slate-50 dark:bg-navy-900 transition-colors ${isOver ? 'bg-navy-100 dark:bg-navy-800' : ''}`}
        >
          <SortableContext items={itemKeys} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
          {campos.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2 italic">
              Arrastra campos aquí
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/formularios/SeccionItem.jsx
git commit -m "feat: SeccionItem — componente sección builder con toggle visibilidad y DnD droppable"
```

---

## Task 9: Refactorizar `CamposList.jsx` con multi-container DnD

**Files:**
- Modify: `client/src/components/formularios/CamposList.jsx`

Los cambios clave:
- Recibe `secciones` y `onChangeSecciones` como nuevas props.
- `campos` ahora tiene `_key` y `_seccionKey` (gestionados por FormularioBuilderPage).
- Un `DndContext` para todo: `onDragEnd` maneja tanto reordenamiento dentro de sección como movimiento entre secciones.
- Bucket "Sin sección" con `useDroppable`.
- Botón "Agregar sección" con icono `FolderPlus`.

- [ ] **Step 1: Reemplazar el contenido completo de `CamposList.jsx`**

```jsx
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Pencil, Trash2, Plus, FolderPlus,
  Type, AlignLeft, Hash, Calendar, CircleDot, CheckSquare, Paperclip, PenLine,
} from 'lucide-react';
import { Button } from '../common/Button';
import { CampoEditorModal } from './CampoEditorModal';
import { SeccionItem } from './SeccionItem';

const TIPO_ICONS = {
  texto_corto: Type,
  texto_largo: AlignLeft,
  numero: Hash,
  fecha: Calendar,
  seleccion_unica: CircleDot,
  seleccion_multiple: CheckSquare,
  archivo: Paperclip,
  firma: PenLine,
};

function TipoIcon({ tipo }) {
  const Icon = TIPO_ICONS[tipo] || Type;
  return <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />;
}

function SortableCampo({ campo, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: campo._key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-800"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <TipoIcon tipo={campo.tipo} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{campo.etiqueta}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{campo.tipo?.replace('_', ' ')}</p>
      </div>
      {campo.requerido && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
          Requerido
        </span>
      )}
      <div className="flex gap-1">
        <button
          onClick={() => onEdit(campo._key)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-500 dark:text-slate-400"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(campo._key)}
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-slate-400 hover:text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function CampoOverlay({ campo }) {
  if (!campo) return null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-orange-400 bg-white dark:bg-navy-800 shadow-lg opacity-90">
      <GripVertical className="w-4 h-4 text-orange-400" />
      <TipoIcon tipo={campo.tipo} />
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{campo.etiqueta}</span>
    </div>
  );
}

function UnsectionedBucket({ campos, onEditCampo, onDeleteCampo }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'droppable-unsectioned' });
  if (campos.length === 0) return null;
  return (
    <div
      className={`rounded-lg border-2 border-dashed p-2 transition-colors ${isOver ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-300 dark:border-navy-500 bg-slate-50 dark:bg-navy-900/50'}`}
    >
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">
        Sin sección
      </p>
      <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[20px]">
        <SortableContext items={campos.map(c => c._key)} strategy={verticalListSortingStrategy}>
          {campos.map(campo => (
            <SortableCampo
              key={campo._key}
              campo={campo}
              onEdit={onEditCampo}
              onDelete={onDeleteCampo}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function CamposList({ campos = [], onChange, secciones = [], onChangeSecciones }) {
  const [showModal, setShowModal] = useState(false);
  const [editandoKey, setEditandoKey] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Agrupación de campos por sección
  const camposBySec = {};
  secciones.forEach(s => { camposBySec[s._key] = []; });
  camposBySec.__unsectioned = [];
  campos.forEach(c => {
    const k = c._seccionKey;
    if (k && camposBySec[k]) camposBySec[k].push(c);
    else camposBySec.__unsectioned.push(c);
  });

  const activeCampo = activeId ? campos.find(c => c._key === activeId) : null;

  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const fromCampo = campos.find(c => c._key === active.id);
    if (!fromCampo) return;

    const overId = String(over.id);

    // Dropped on a container droppable (empty section or unsectioned)
    if (overId.startsWith('droppable-')) {
      const containerKey = overId.replace('droppable-', '');
      const newSeccionKey = containerKey === 'unsectioned' ? null : containerKey;
      if (fromCampo._seccionKey !== newSeccionKey) {
        onChange(campos.map(c => c._key === active.id ? { ...c, _seccionKey: newSeccionKey } : c));
      }
      return;
    }

    // Dropped on another campo
    const toCampo = campos.find(c => c._key === over.id);
    if (!toCampo) return;

    if (fromCampo._seccionKey === toCampo._seccionKey) {
      // Same container: reorder
      const oldIdx = campos.findIndex(c => c._key === active.id);
      const newIdx = campos.findIndex(c => c._key === over.id);
      onChange(arrayMove(campos, oldIdx, newIdx));
    } else {
      // Different container: move to target section, insert at target position
      const movedCampo = { ...fromCampo, _seccionKey: toCampo._seccionKey };
      const withoutActive = campos.filter(c => c._key !== active.id);
      const targetIdx = withoutActive.findIndex(c => c._key === over.id);
      const next = [...withoutActive];
      next.splice(targetIdx, 0, movedCampo);
      onChange(next);
    }
  }

  function handleSaveCampo(data) {
    if (editandoKey !== null) {
      onChange(campos.map(c => c._key === editandoKey ? { ...c, ...data } : c));
    } else {
      onChange([...campos, { ...data, _key: `campo-${Date.now()}`, _seccionKey: null }]);
    }
    setEditandoKey(null);
  }

  function handleEditCampo(key) {
    setEditandoKey(key);
    setShowModal(true);
  }

  function handleDeleteCampo(key) {
    onChange(campos.filter(c => c._key !== key));
  }

  function handleAgregarSeccion() {
    const nueva = {
      _key: `sec-${Date.now()}`,
      id: null,
      nombre: 'Nueva sección',
      orden: secciones.length,
      visibleParaUsuario: false,
    };
    onChangeSecciones([...secciones, nueva]);
  }

  function handleRenombrarSeccion(key, nombre) {
    onChangeSecciones(secciones.map(s => s._key === key ? { ...s, nombre } : s));
  }

  function handleToggleVisible(key) {
    onChangeSecciones(secciones.map(s =>
      s._key === key ? { ...s, visibleParaUsuario: !s.visibleParaUsuario } : s
    ));
  }

  function handleEliminarSeccion(key) {
    // Campos de esa sección pasan a sin sección
    onChange(campos.map(c => c._seccionKey === key ? { ...c, _seccionKey: null } : c));
    onChangeSecciones(secciones.filter(s => s._key !== key));
  }

  const editandoCampo = editandoKey !== null ? campos.find(c => c._key === editandoKey) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={() => { setEditandoKey(null); setShowModal(true); }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar campo
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleAgregarSeccion}
          className="gap-2 border-navy-600 text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800"
        >
          <FolderPlus className="w-4 h-4" />
          Agregar sección
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Secciones */}
        {secciones.map(seccion => (
          <SeccionItem
            key={seccion._key}
            seccion={seccion}
            campos={camposBySec[seccion._key] || []}
            onRenombrar={handleRenombrarSeccion}
            onToggleVisible={handleToggleVisible}
            onEliminar={handleEliminarSeccion}
          >
            {(camposBySec[seccion._key] || []).map(campo => (
              <SortableCampo
                key={campo._key}
                campo={campo}
                onEdit={handleEditCampo}
                onDelete={handleDeleteCampo}
              />
            ))}
          </SeccionItem>
        ))}

        {/* Sin sección */}
        <UnsectionedBucket
          campos={camposBySec.__unsectioned}
          onEditCampo={handleEditCampo}
          onDeleteCampo={handleDeleteCampo}
        />

        {/* Estado vacío total */}
        {campos.length === 0 && secciones.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-lg">
            Aún no hay campos ni secciones. Agrega el primero.
          </div>
        )}

        <DragOverlay dropAnimation={null}>
          <CampoOverlay campo={activeCampo} />
        </DragOverlay>
      </DndContext>

      <CampoEditorModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditandoKey(null); }}
        onSave={handleSaveCampo}
        campoInicial={editandoCampo || null}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar que el servidor y cliente compilan sin errores**

```bash
cd soporte-ti-istho/client && npm run dev
```

Expected: Vite compila sin errores. La pestaña Campos del builder renderiza los botones "Agregar campo" y "Agregar sección".

- [ ] **Step 3: Commit**

```bash
git add client/src/components/formularios/CamposList.jsx
git commit -m "feat: CamposList — secciones colapsables con multi-container DnD y bucket sin sección"
```

---

## Task 10: Actualizar `FormularioBuilderPage.jsx` y `formulariosApi.js`

**Files:**
- Modify: `client/src/pages/FormularioBuilderPage.jsx`
- Modify: `client/src/services/formulariosApi.js`

- [ ] **Step 1: Actualizar `formulariosApi.guardarCampos` para enviar secciones**

En `client/src/services/formulariosApi.js`, reemplazar la línea:

```js
// ANTES
guardarCampos: (id, campos) => api.post(`/formularios/${id}/campos`, { campos }),
```

Por:

```js
// DESPUÉS
guardarCampos: (id, campos, secciones = []) => api.post(`/formularios/${id}/campos`, { campos, secciones }),
```

- [ ] **Step 2: Agregar estado `secciones` y actualizar la carga inicial en `FormularioBuilderPage`**

En `FormularioBuilderPage.jsx`, después de la línea `const [campos, setCampos] = useState([]);` (línea 34), agregar:

```js
const [secciones, setSecciones] = useState([]);
```

En el `useEffect` de carga (línea 44), actualizar el bloque que carga `campos` para incluir la carga de secciones y la asignación de `_key`/`_seccionKey`:

Reemplazar:
```js
    formulariosApi.obtener(id).then((res) => {
      const f = res.data.data;
      setConfig({ nombre: f.nombre, descripcion: f.descripcion || '', acceso: f.acceso, activo: f.activo });
      setCampos(f.campos || []);
      if (f.plantillas && f.plantillas.length > 0) {
        setPlantilla(f.plantillas[0]);
        setMapeoInicial(f.plantillas[0].mapeos || []);
      }
      setLoading(false);
    }).catch(() => {
      toast.error('Error al cargar formulario');
      setLoading(false);
    });
```

Por:

```js
    formulariosApi.obtener(id).then((res) => {
      const f = res.data.data;
      setConfig({ nombre: f.nombre, descripcion: f.descripcion || '', acceso: f.acceso, activo: f.activo });

      const seccionesServer = (f.secciones || []).map(s => ({ ...s, _key: String(s.id) }));
      setSecciones(seccionesServer);

      const camposServer = (f.campos || []).map(c => ({
        ...c,
        _key: String(c.id),
        _seccionKey: c.seccionId
          ? (seccionesServer.find(s => s.id === c.seccionId)?._key || String(c.seccionId))
          : null,
      }));
      setCampos(camposServer);

      if (f.plantillas && f.plantillas.length > 0) {
        setPlantilla(f.plantillas[0]);
        setMapeoInicial(f.plantillas[0].mapeos || []);
      }
      setLoading(false);
    }).catch(() => {
      toast.error('Error al cargar formulario');
      setLoading(false);
    });
```

- [ ] **Step 3: Actualizar `guardarCampos` en FormularioBuilderPage para enviar y recibir secciones**

Reemplazar la función `guardarCampos` completa:

```js
  async function guardarCampos() {
    let fId = formularioId;
    if (!fId) {
      if (!config.nombre.trim()) {
        toast.error('Completa el nombre del formulario en Configuración primero');
        setTab('config');
        return;
      }
      try {
        const res = await formulariosApi.crear({ ...config });
        fId = res.data.data.id;
        setFormularioId(fId);
        navigate(`/formularios/${fId}/editar`, { replace: true });
      } catch {
        toast.error('Error al crear formulario');
        return;
      }
    }
    setSaving(true);
    try {
      const res = await formulariosApi.guardarCampos(fId, campos, secciones);
      const { secciones: savedSecciones, campos: savedCampos } = res.data.data;

      // Reconstruir secciones con _key echoed por el servidor
      setSecciones(savedSecciones.map(s => ({ ...s, _key: s._key || String(s.id) })));

      // Reconstruir campos con _key y _seccionKey actualizados
      const seccionesActualizadas = savedSecciones.map(s => ({ ...s, _key: s._key || String(s.id) }));
      setCampos(savedCampos.map(c => ({
        ...c,
        _key: String(c.id),
        _seccionKey: c.seccionId
          ? (seccionesActualizadas.find(s => s.id === c.seccionId)?._key || String(c.seccionId))
          : null,
      })));

      toast.success('Campos guardados');
    } catch {
      toast.error('Error al guardar campos');
    } finally {
      setSaving(false);
    }
  }
```

- [ ] **Step 4: Pasar `secciones` y `onChangeSecciones` a `CamposList`**

En el JSX del tab Campos (alrededor de la línea 203), reemplazar:

```jsx
// ANTES
<CamposList campos={campos} onChange={setCampos} />
```

Por:

```jsx
// DESPUÉS
<CamposList
  campos={campos}
  onChange={setCampos}
  secciones={secciones}
  onChangeSecciones={setSecciones}
/>
```

- [ ] **Step 5: Probar en el navegador**

1. Abrir `http://localhost:5173`, ir a un formulario existente → editar.
2. Ir a la pestaña Campos.
3. Click "Agregar sección" → aparece sección "Nueva sección".
4. Renombrar la sección.
5. Agregar un campo → aparece en "Sin sección".
6. Arrastrar el campo a la sección.
7. Click "Guardar campos".

Expected: no errores en consola, secciones y campos se guardan correctamente.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/FormularioBuilderPage.jsx client/src/services/formulariosApi.js
git commit -m "feat: FormularioBuilderPage — estado secciones, guardarCampos con secciones, carga desde servidor"
```

---

## Task 11: `PDFMapper.jsx` — inspector de tipografía

**Files:**
- Modify: `client/src/components/formularios/PDFMapper.jsx`

Agregar sección de tipografía en el inspector: selector de fuente, toggles Negrita/Cursiva, selector de color, y vista previa.

- [ ] **Step 1: Agregar iconos `Bold` e `Italic` al import de Lucide**

En la línea 7 del archivo, reemplazar la importación de Lucide:

```js
// ANTES
import { X, ChevronLeft, ChevronRight, Save } from 'lucide-react';
```

Por:

```js
// DESPUÉS
import { X, ChevronLeft, ChevronRight, Save, Bold, Italic } from 'lucide-react';
```

- [ ] **Step 2: Agregar los nuevos campos tipografía al objeto `mapeo` inicial cuando se hace drop**

En `handleDragEnd`, el objeto de nuevo mapeo (alrededor de la línea 285) actualmente no tiene campos de tipografía. Reemplazar:

```js
// ANTES
      setMapeos((prev) => [
        ...prev,
        {
          _key: newKey,
          campoId: campo.id,
          etiqueta: campo.etiqueta,
          pagina: pageNum,
          ...pos,
          ancho: 20,
          alto: 5,
          fontTamano: 10,
          pdfCampoNombre: '',
        },
      ]);
```

Por:

```js
// DESPUÉS
      setMapeos((prev) => [
        ...prev,
        {
          _key: newKey,
          campoId: campo.id,
          etiqueta: campo.etiqueta,
          pagina: pageNum,
          ...pos,
          ancho: 20,
          alto: 5,
          fontTamano: 10,
          fontFamilia: 'Helvetica',
          fontNegrita: false,
          fontCursiva: false,
          fontColor: '#000000',
          pdfCampoNombre: '',
        },
      ]);
```

- [ ] **Step 3: Agregar la sección Tipografía al inspector**

En el inspector del `PDFMapper` (la sección `{selectedMapeo && (...)}`, alrededor de la línea 400), el bloque `<div className="flex flex-wrap gap-3">` contiene los `InspectorInput` de posición/tamaño. Agregar la sección de tipografía **después del último `InspectorInput` (Pos Y) y antes del cierre `</div>` del flex-wrap**.

Reemplazar el bloque del inspector completo:

```jsx
          {selectedMapeo && (
            <div className="border border-orange-200 dark:border-orange-800/50 rounded-lg p-3 bg-orange-50/50 dark:bg-navy-800">
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3">
                Inspector: <span className="font-normal">{selectedMapeo.etiqueta}</span>
                <span className="ml-2 text-slate-400 dark:text-slate-500 font-normal">— Página {selectedMapeo.pagina}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                {selectedCampo?.tipo === 'fecha' && (
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Parte de la fecha</label>
                    <Select
                      value={selectedMapeo.formatoFecha || 'completa'}
                      onChange={(v) => updateMapeo(selectedKey, { formatoFecha: v })}
                      options={[
                        { value: 'completa', label: 'Fecha completa' },
                        { value: 'dia', label: 'Día (número)' },
                        { value: 'mes', label: 'Mes (número)' },
                        { value: 'mes_nombre', label: 'Mes (nombre)' },
                        { value: 'anio', label: 'Año' },
                      ]}
                    />
                  </div>
                )}
                <InspectorInput
                  label="Ancho (%)"
                  value={Math.round((selectedMapeo.ancho || 15) * 10) / 10}
                  min={3} max={90} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { ancho: v })}
                />
                <InspectorInput
                  label="Alto (%)"
                  value={Math.round((selectedMapeo.alto || 5) * 10) / 10}
                  min={1} max={50} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { alto: v })}
                />
                <InspectorInput
                  label="Fuente (pt)"
                  value={selectedMapeo.fontTamano || 10}
                  min={6} max={36} step={1}
                  onChange={(v) => updateMapeo(selectedKey, { fontTamano: v })}
                />
                <InspectorInput
                  label="Pos X (%)"
                  value={Math.round((selectedMapeo.posX || 0) * 10) / 10}
                  min={0} max={98} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { posX: v })}
                />
                <InspectorInput
                  label="Pos Y (%)"
                  value={Math.round((selectedMapeo.posY || 0) * 10) / 10}
                  min={0} max={98} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { posY: v })}
                />
              </div>
            </div>
          )}
```

Por:

```jsx
          {selectedMapeo && (
            <div className="border border-orange-200 dark:border-orange-800/50 rounded-lg p-3 bg-orange-50/50 dark:bg-navy-800">
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3">
                Inspector: <span className="font-normal">{selectedMapeo.etiqueta}</span>
                <span className="ml-2 text-slate-400 dark:text-slate-500 font-normal">— Página {selectedMapeo.pagina}</span>
              </p>

              {/* Posición y tamaño */}
              <div className="flex flex-wrap gap-3 mb-4">
                {selectedCampo?.tipo === 'fecha' && (
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Parte de la fecha</label>
                    <Select
                      value={selectedMapeo.formatoFecha || 'completa'}
                      onChange={(v) => updateMapeo(selectedKey, { formatoFecha: v })}
                      options={[
                        { value: 'completa', label: 'Fecha completa' },
                        { value: 'dia', label: 'Día (número)' },
                        { value: 'mes', label: 'Mes (número)' },
                        { value: 'mes_nombre', label: 'Mes (nombre)' },
                        { value: 'anio', label: 'Año' },
                      ]}
                    />
                  </div>
                )}
                <InspectorInput
                  label="Ancho (%)"
                  value={Math.round((selectedMapeo.ancho || 15) * 10) / 10}
                  min={3} max={90} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { ancho: v })}
                />
                <InspectorInput
                  label="Alto (%)"
                  value={Math.round((selectedMapeo.alto || 5) * 10) / 10}
                  min={1} max={50} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { alto: v })}
                />
                <InspectorInput
                  label="Fuente (pt)"
                  value={selectedMapeo.fontTamano || 10}
                  min={6} max={36} step={1}
                  onChange={(v) => updateMapeo(selectedKey, { fontTamano: v })}
                />
                <InspectorInput
                  label="Pos X (%)"
                  value={Math.round((selectedMapeo.posX || 0) * 10) / 10}
                  min={0} max={98} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { posX: v })}
                />
                <InspectorInput
                  label="Pos Y (%)"
                  value={Math.round((selectedMapeo.posY || 0) * 10) / 10}
                  min={0} max={98} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { posY: v })}
                />
              </div>

              {/* Separador */}
              <div className="border-t border-orange-200 dark:border-orange-800/40 mb-3" />

              {/* Tipografía */}
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Tipografía
              </p>

              {/* Fuente + Tamaño */}
              <div className="flex gap-2 mb-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Fuente</label>
                  <select
                    value={selectedMapeo.fontFamilia || 'Helvetica'}
                    onChange={e => updateMapeo(selectedKey, { fontFamilia: e.target.value })}
                    className="px-2 py-1 text-sm border border-slate-300 dark:border-navy-500 rounded bg-white dark:bg-navy-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="TimesRoman">Times New Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>
                <InspectorInput
                  label="PT"
                  value={selectedMapeo.fontTamano || 10}
                  min={6} max={72} step={1}
                  onChange={(v) => updateMapeo(selectedKey, { fontTamano: v })}
                />
              </div>

              {/* Negrita / Cursiva / Color */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  title="Negrita"
                  onClick={() => updateMapeo(selectedKey, { fontNegrita: !selectedMapeo.fontNegrita })}
                  className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${
                    selectedMapeo.fontNegrita
                      ? 'bg-navy-700 border-navy-700 text-white'
                      : 'bg-white dark:bg-navy-700 border-slate-300 dark:border-navy-500 text-slate-600 dark:text-slate-300 hover:border-navy-500'
                  }`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Cursiva"
                  onClick={() => updateMapeo(selectedKey, { fontCursiva: !selectedMapeo.fontCursiva })}
                  className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${
                    selectedMapeo.fontCursiva
                      ? 'bg-navy-700 border-navy-700 text-white'
                      : 'bg-white dark:bg-navy-700 border-slate-300 dark:border-navy-500 text-slate-600 dark:text-slate-300 hover:border-navy-500'
                  }`}
                >
                  <Italic className="w-4 h-4" />
                </button>
                <div className="flex-1" />
                <label className="text-xs text-slate-500 dark:text-slate-400">Color</label>
                <div className="relative">
                  <div
                    className="w-7 h-7 rounded border-2 border-slate-300 dark:border-navy-500 cursor-pointer"
                    style={{ backgroundColor: selectedMapeo.fontColor || '#000000' }}
                    onClick={() => document.getElementById(`color-input-${selectedKey}`)?.click()}
                  />
                  <input
                    id={`color-input-${selectedKey}`}
                    type="color"
                    value={selectedMapeo.fontColor || '#000000'}
                    onChange={e => updateMapeo(selectedKey, { fontColor: e.target.value })}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={selectedMapeo.fontColor || '#000000'}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                      updateMapeo(selectedKey, { fontColor: v });
                    }
                  }}
                  maxLength={7}
                  className="w-20 px-2 py-1 text-xs border border-slate-300 dark:border-navy-500 rounded bg-white dark:bg-navy-700 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              {/* Vista previa */}
              <div className="rounded border border-dashed border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-900 px-3 py-2 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Vista previa</p>
                <span
                  style={{
                    fontFamily: selectedMapeo.fontFamilia === 'TimesRoman'
                      ? 'serif'
                      : selectedMapeo.fontFamilia === 'Courier'
                        ? 'monospace'
                        : 'sans-serif',
                    fontWeight: selectedMapeo.fontNegrita ? 'bold' : 'normal',
                    fontStyle: selectedMapeo.fontCursiva ? 'italic' : 'normal',
                    color: selectedMapeo.fontColor || '#000000',
                    fontSize: `${Math.max(10, Math.min(24, selectedMapeo.fontTamano || 10))}px`,
                  }}
                >
                  Texto de ejemplo
                </span>
              </div>
            </div>
          )}
```

- [ ] **Step 2: Probar en el navegador**

1. Ir a la pestaña PDF & Mapeo de un formulario con campos y plantilla.
2. Arrastrar un campo al PDF.
3. Click en el chip para seleccionarlo.
4. Verificar que el inspector muestra la sección Tipografía.
5. Cambiar fuente a TimesRoman, activar Negrita, cambiar color a azul.
6. Verificar que la vista previa actualiza en tiempo real.
7. Click "Guardar mapeo".

Expected: mapeo se guarda, no hay errores en consola.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/formularios/PDFMapper.jsx
git commit -m "feat: PDFMapper — inspector tipografía con fuente, negrita, cursiva, color y vista previa"
```

---

## Task 12: `FormularioRenderer.jsx` — secciones colapsables en formulario público

**Files:**
- Modify: `client/src/components/formularios/FormularioRenderer.jsx`
- Modify: `client/src/pages/FormularioResponderPage.jsx`

- [ ] **Step 1: Reemplazar `FormularioRenderer.jsx` con soporte de secciones**

```jsx
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { FileUploadZone } from '../common/FileUploadZone';
import { FirmaCanvas } from './FirmaCanvas';

function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* noop */ }
  }
  return [];
}

function SeccionColapsable({ nombre, children }) {
  const [expandida, setExpandida] = useState(true);
  return (
    <div className="rounded-lg border-2 border-navy-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandida(e => !e)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-navy-700 text-white text-left"
      >
        {expandida
          ? <ChevronDown className="w-4 h-4 shrink-0" />
          : <ChevronRight className="w-4 h-4 shrink-0" />}
        <span className="font-semibold text-sm">{nombre}</span>
      </button>
      {expandida && (
        <div className="p-4 flex flex-col gap-5 bg-white dark:bg-navy-800">
          {children}
        </div>
      )}
    </div>
  );
}

export function FormularioRenderer({ campos = [], secciones = [], valores = {}, onChange, disabled }) {
  function handleChange(campoId, value) {
    if (onChange) onChange({ ...valores, [campoId]: value });
  }

  // Sin secciones: comportamiento original
  if (secciones.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {campos.map(campo => (
          <CampoInput
            key={campo.id}
            campo={campo}
            value={valores[campo.id] ?? ''}
            onChange={v => handleChange(campo.id, v)}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }

  // Con secciones: agrupar campos por seccionId
  const seccionMap = new Map(secciones.map(s => [s.id, s]));

  // Campos agrupados por sección visible, luego campos de secciones ocultas (flat), luego sin sección (flat)
  const groups = [];

  // Secciones visibles: render colapsable
  const seccionesVisibles = secciones.filter(s => s.visibleParaUsuario);
  for (const sec of seccionesVisibles) {
    const secCampos = campos
      .filter(c => c.seccionId === sec.id)
      .sort((a, b) => a.orden - b.orden);
    if (secCampos.length > 0) {
      groups.push({ tipo: 'visible', seccion: sec, campos: secCampos });
    }
  }

  // Secciones no visibles: campos flat sin encabezado
  const seccionesOcultas = secciones.filter(s => !s.visibleParaUsuario);
  const camposOcultos = campos.filter(c =>
    c.seccionId && seccionesOcultas.some(s => s.id === c.seccionId)
  ).sort((a, b) => a.orden - b.orden);
  if (camposOcultos.length > 0) {
    groups.push({ tipo: 'oculto', campos: camposOcultos });
  }

  // Sin sección
  const camposSinSeccion = campos
    .filter(c => !c.seccionId || !seccionMap.has(c.seccionId))
    .sort((a, b) => a.orden - b.orden);
  if (camposSinSeccion.length > 0) {
    groups.push({ tipo: 'sin_seccion', campos: camposSinSeccion });
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group, i) => {
        if (group.tipo === 'visible') {
          return (
            <SeccionColapsable key={group.seccion.id} nombre={group.seccion.nombre}>
              {group.campos.map(campo => (
                <CampoInput
                  key={campo.id}
                  campo={campo}
                  value={valores[campo.id] ?? ''}
                  onChange={v => handleChange(campo.id, v)}
                  disabled={disabled}
                />
              ))}
            </SeccionColapsable>
          );
        }
        // Flat (oculto o sin sección)
        return group.campos.map(campo => (
          <CampoInput
            key={campo.id}
            campo={campo}
            value={valores[campo.id] ?? ''}
            onChange={v => handleChange(campo.id, v)}
            disabled={disabled}
          />
        ));
      })}
    </div>
  );
}

function CampoInput({ campo, value, onChange, disabled }) {
  const label = (
    <span className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {campo.etiqueta}
      {campo.requerido && <span className="text-orange-500">*</span>}
    </span>
  );

  if (campo.tipo === 'texto_corto') {
    return (
      <div>
        {label}
        {campo.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{campo.descripcion}</p>}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.placeholder || ''}
          disabled={disabled}
        />
      </div>
    );
  }

  if (campo.tipo === 'texto_largo') {
    return (
      <div>
        {label}
        {campo.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{campo.descripcion}</p>}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.placeholder || ''}
          disabled={disabled}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-y disabled:opacity-60"
        />
      </div>
    );
  }

  if (campo.tipo === 'numero') {
    return (
      <div>
        {label}
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.placeholder || ''}
          disabled={disabled}
        />
      </div>
    );
  }

  if (campo.tipo === 'fecha') {
    return (
      <div>
        {label}
        <DatePicker value={value} onChange={onChange} disabled={disabled} />
      </div>
    );
  }

  if (campo.tipo === 'seleccion_unica') {
    const opciones = toArray(campo.opciones).map((o) => ({ value: o, label: o }));
    return (
      <div>
        {label}
        <Select value={value} onChange={onChange} options={opciones} placeholder="Seleccionar..." disabled={disabled} />
      </div>
    );
  }

  if (campo.tipo === 'seleccion_multiple') {
    const opciones = toArray(campo.opciones);
    const selected = Array.isArray(value) ? value : [];
    return (
      <div>
        {label}
        <div className="flex flex-col gap-2">
          {opciones.map((opcion) => (
            <label key={opcion} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opcion)}
                disabled={disabled}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opcion]
                    : selected.filter((o) => o !== opcion);
                  onChange(next);
                }}
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              {opcion}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (campo.tipo === 'archivo') {
    return (
      <div>
        {label}
        <FileUploadZone onFileSelect={(file) => onChange(file)} disabled={disabled} accept="*/*" maxFiles={1} />
      </div>
    );
  }

  if (campo.tipo === 'firma') {
    return (
      <div>
        {label}
        {campo.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{campo.descripcion}</p>}
        <FirmaCanvas value={value} onChange={onChange} disabled={disabled} />
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Pasar `secciones` a `FormularioRenderer` en `FormularioResponderPage.jsx`**

En `FormularioResponderPage.jsx`, reemplazar:

```jsx
// ANTES
        <FormularioRenderer
          campos={formulario.campos || []}
          valores={valores}
          onChange={setValores}
          disabled={submitting}
        />
```

Por:

```jsx
// DESPUÉS
        <FormularioRenderer
          campos={formulario.campos || []}
          secciones={formulario.secciones || []}
          valores={valores}
          onChange={setValores}
          disabled={submitting}
        />
```

- [ ] **Step 3: Probar en el navegador**

1. Ir a la URL pública de un formulario que tenga secciones.
2. Verificar que las secciones con `visibleParaUsuario=true` aparecen como bloques colapsables con encabezado navy.
3. Click en el encabezado → el bloque se colapsa.
4. Las secciones con `visibleParaUsuario=false` muestran sus campos sin encabezado.
5. Los campos sin sección aparecen al final.
6. Llenar el formulario y enviarlo → no debe haber errores.

Expected: formulario funciona correctamente con y sin secciones.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/formularios/FormularioRenderer.jsx client/src/pages/FormularioResponderPage.jsx
git commit -m "feat: FormularioRenderer — secciones colapsables para el usuario final (visibleParaUsuario)"
```

---

## Checklist de revisión final

Antes de terminar, verificar:

- [ ] `npm run db:migrate` aplica las dos migraciones sin error.
- [ ] El servidor arranca limpio después de todos los cambios de modelos.
- [ ] El builder muestra botones "Agregar campo" y "Agregar sección".
- [ ] Se pueden crear, renombrar y eliminar secciones.
- [ ] El toggle de visibilidad cambia entre ON (verde) y OFF (gris).
- [ ] Los campos se pueden arrastrar entre secciones y al bucket "Sin sección".
- [ ] "Guardar campos" persiste secciones y campos con sus relaciones.
- [ ] Al recargar el formulario, las secciones y sus campos se restauran correctamente.
- [ ] El inspector del PDFMapper muestra la sección Tipografía al seleccionar un chip.
- [ ] Los cambios de tipografía se ven en la vista previa en tiempo real.
- [ ] "Guardar mapeo" persiste los datos de tipografía.
- [ ] Al generar un PDF, el texto usa la fuente, estilo y color configurados.
- [ ] En el formulario público, las secciones visibles son colapsables con header navy.
- [ ] Las secciones ocultas no muestran encabezado.
- [ ] No hay emojis en ninguna parte de la UI — solo iconos Lucide.
