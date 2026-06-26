'use strict';

const COLS = ['B', 'R', 'M', 'N/A'];

// Grilla opciones helper
function grilla(filas, conObservaciones = false) {
  return JSON.stringify({ columnas: COLS, filas, conObservaciones });
}

const SECCIONES = [
  { nombre: 'Datos Generales',        orden: 0 },
  { nombre: '1. Aspectos Generales',  orden: 1 },
  { nombre: '2. Cabezote',            orden: 2 },
  { nombre: '3. Tráiler',             orden: 3 },
  { nombre: '4. Luces',               orden: 4 },
  { nombre: 'Llantas',                orden: 5 },
  { nombre: 'Frenos',                 orden: 6 },
  { nombre: '5. Equipo de Carretera', orden: 7 },
  { nombre: 'Observaciones y Firma',  orden: 8 },
];

// [seccion, tipo, etiqueta, orden, requerido, opciones, placeholder]
const CAMPOS = [
  // ── Datos Generales ──────────────────────────────────────────────────────
  ['Datos Generales', 'fecha',           'Fecha',                         0, true,  null, null],
  ['Datos Generales', 'texto_corto',     'Centro de operaciones',         1, true,  null, null],
  ['Datos Generales', 'seleccion_unica', 'Tipo de Vehículo',              2, true,
    JSON.stringify(['Sencillo', 'Turbo', 'Tracto mula', 'Otro']), null],
  ['Datos Generales', 'texto_corto',     'Otro tipo de vehículo, ¿cuál?', 3, false, null, 'Especifique'],
  ['Datos Generales', 'texto_corto',     'Placa',                         4, true,  null, null],
  ['Datos Generales', 'texto_corto',     'Responsable de inspección',     5, true,  null, null],

  // ── 1. Aspectos Generales — grilla con observaciones (fechas de vcto.) ──
  ['1. Aspectos Generales', 'grilla', '1. Aspectos Generales', 0, true,
    grilla([
      '1.1 ¿El conductor cuenta con licencia de conducción vigente?',
      '1.2 ¿El vehículo cuenta con revisión tecnicomecánica vigente?',
      '1.3 ¿El vehículo cuenta con SOAT vigente?',
      '1.4 ¿El conductor cuenta con carnet de manipulación de alimentos vigente? (vigencia 1 año)',
      '1.5 ¿El vehículo cuenta con certificado de transporte de alimentos vigente? (vigencia 1 año)',
      '1.6 ¿El vehículo cuenta con certificado de fumigación vigente? (vigencia 3 meses)',
      '1.7 ¿El conductor aplica lista de verificación de seguridad al vehículo?',
      '1.8 ¿Aseo general del vehículo?',
      '1.9 ¿Se realiza mantenimiento preventivo al vehículo?',
    ], true), // conObservaciones: fechas de vencimiento / último mantenimiento
    null],

  // ── 2. Cabezote ──────────────────────────────────────────────────────────
  ['2. Cabezote', 'grilla', '2. Cabezote', 0, true,
    grilla([
      '2.1 ¿Fugas de aceite?',
      '2.1B Fugas de combustible',
      '2.2 ¿Batería en buen estado y funcionamiento?',
      '2.2B Espejos retrovisores',
      '2.3 Compresor de aire',
      '2.3B Estado de puertas',
      '2.4 Bomba hidráulica',
      '2.4B Escaleras',
      '2.5 Nivel de agua radiador',
      '2.5B Estado de mofles-silenciador',
      '2.6 Estado de correas',
      '2.6B Estado de mofles-silenciador (tráiler)',
    ]), null],

  // ── 3. Tráiler ───────────────────────────────────────────────────────────
  ['3. Tráiler', 'grilla', '3. Tráiler', 0, true,
    grilla([
      '3.1 Cable de corriente',
      '3.1B Enganche',
      '3.2 Chasis',
      '3.2B Estado de piso',
      '3.3 Pala Antichispa',
      '3.3B Estado de carpa',
      '3.4 Estado acople rápido-manguera',
    ]), null],

  // ── 4. Luces ─────────────────────────────────────────────────────────────
  ['4. Luces', 'grilla', '4. Luces', 0, true,
    grilla([
      '4.1 ¿Las luces altas funcionan correctamente?',
      '4.2 ¿Las luces bajas funcionan correctamente?',
      '4.3 ¿Las medias funcionan correctamente?',
      '4.4 ¿Las direccionales funcionan correctamente?',
      '4.5 ¿Los espejos están en buen estado y funcionamiento?',
    ]), null],

  // ── Llantas ───────────────────────────────────────────────────────────────
  ['Llantas', 'grilla', 'Llantas', 0, true,
    grilla([
      '¿El vehículo tiene las llantas delanteras en buen estado?',
      '¿El vehículo tiene las llantas traseras en buen estado?',
      '¿El vehículo cuenta con llanta de repuesto?',
    ]), null],

  // ── Frenos ────────────────────────────────────────────────────────────────
  ['Frenos', 'grilla', 'Frenos', 0, true,
    grilla([
      '¿Se realiza revisión preventiva de los frenos?',
      '¿Los frenos se encuentran en buen estado?',
    ]), null],

  // ── 5. Equipo de Carretera ────────────────────────────────────────────────
  ['5. Equipo de Carretera', 'grilla', '5. Equipo de Carretera', 0, true,
    grilla([
      '5.1 ¿Cuenta con botiquín de primeros auxilios?',
      '5.2 ¿Cuenta con extintor?',
      '5.3 ¿Cuenta con gato hidráulico?',
      '5.4 ¿Cuenta con linterna?',
      '5.5 ¿Cuenta con crucetas?',
      '5.6 ¿Cuenta con chaleco con reflectivos?',
      '5.7 ¿Cuenta con conos de seguridad?',
    ]), null],
  ['5. Equipo de Carretera', 'fecha', 'Fecha de vencimiento del extintor (5.2)', 1, false, null, null],

  // ── Observaciones y Firma ─────────────────────────────────────────────────
  ['Observaciones y Firma', 'texto_largo', 'Observaciones',                                       0, false, null, null],
  ['Observaciones y Firma', 'texto_corto', 'Responsable que verifica eficacia de la Inspección', 1, true,  null, null],
  ['Observaciones y Firma', 'firma',       'Firma del responsable',                               2, true,  null, null],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const q = (sql) => queryInterface.sequelize.query(sql, { type: queryInterface.sequelize.QueryTypes.SELECT });

    const [adminRow] = await q("SELECT id FROM usuarios WHERE email = 'admin@istho.com.co' LIMIT 1");
    const creadoPor = adminRow?.id || 1;

    await queryInterface.bulkInsert('formularios', [{
      nombre:      'GT-FT-07 - Inspección de Vehículos Terceros',
      descripcion: 'Inspección de condiciones y documentación de vehículos de terceros. Código: GT-FT-07 Versión: 03 — B: Bueno · R: Regular · M: Malo · N/A: No Aplica',
      acceso:      'autenticado',
      activo:      true,
      creado_por:  creadoPor,
      created_at:  now,
      updated_at:  now,
    }]);

    const [fRow] = await q("SELECT id FROM formularios WHERE nombre = 'GT-FT-07 - Inspección de Vehículos Terceros' ORDER BY id DESC LIMIT 1");
    const formularioId = fRow.id;

    await queryInterface.bulkInsert('formulario_secciones',
      SECCIONES.map(s => ({
        formulario_id:        formularioId,
        nombre:               s.nombre,
        orden:                s.orden,
        visible_para_usuario: true,
        condiciones:          null,
        created_at:           now,
        updated_at:           now,
      }))
    );

    const seccionRows = await q(
      `SELECT id, nombre FROM formulario_secciones WHERE formulario_id = ${formularioId} ORDER BY orden`
    );
    const seccionIds = {};
    seccionRows.forEach(s => { seccionIds[s.nombre] = s.id; });

    await queryInterface.bulkInsert('formulario_campos',
      CAMPOS.map(([seccion, tipo, etiqueta, orden, requerido, opciones, placeholder]) => ({
        formulario_id: formularioId,
        seccion_id:    seccionIds[seccion],
        tipo,
        etiqueta,
        descripcion:   null,
        placeholder:   placeholder || null,
        requerido:     requerido ? 1 : 0,
        orden,
        opciones:      opciones || null,
        condiciones:   null,
        created_at:    now,
        updated_at:    now,
      }))
    );

    // Condición: "Otro tipo de vehículo" solo visible cuando "Tipo de Vehículo" = "Otro"
    const [tipoVehRow] = await q(
      `SELECT id FROM formulario_campos WHERE formulario_id = ${formularioId} AND etiqueta = 'Tipo de Vehículo' LIMIT 1`
    );
    const [otroVehRow] = await q(
      `SELECT id FROM formulario_campos WHERE formulario_id = ${formularioId} AND etiqueta = 'Otro tipo de vehículo, ¿cuál?' LIMIT 1`
    );
    if (tipoVehRow && otroVehRow) {
      const condicion = JSON.stringify({
        operadorLogico: 'Y',
        reglas: [{ campoId: tipoVehRow.id, operador: 'igual', valor: 'Otro' }],
      });
      await queryInterface.sequelize.query(
        `UPDATE formulario_campos SET condiciones = ? WHERE id = ?`,
        { replacements: [condicion, otroVehRow.id] }
      );
    }
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM formularios WHERE nombre = 'GT-FT-07 - Inspección de Vehículos Terceros'"
    );
    if (!rows.length) return;
    const id = rows[0].id;
    await queryInterface.sequelize.query(`DELETE FROM formulario_campos    WHERE formulario_id = ${id}`);
    await queryInterface.sequelize.query(`DELETE FROM formulario_secciones WHERE formulario_id = ${id}`);
    await queryInterface.sequelize.query(`DELETE FROM formularios          WHERE id = ${id}`);
  },
};
