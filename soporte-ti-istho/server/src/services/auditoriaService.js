const { Auditoria } = require('../models');

async function registrarAuditoria({ tabla, registro_id, operacion, datos_anteriores, datos_nuevos, campo_modificado, usuario_id, ip_address, user_agent, transaction = null }) {
  try {
    await Auditoria.create({
      tabla, registro_id, operacion,
      datos_anteriores: datos_anteriores || null,
      datos_nuevos: datos_nuevos || null,
      campo_modificado: campo_modificado || null,
      usuario_id: usuario_id || null,
      ip_address: ip_address || null,
      user_agent: user_agent || null,
    }, transaction ? { transaction } : {});
  } catch (err) {
    if (transaction) throw err; // propaga para que el TX haga rollback
    console.error('Error registrando auditoría:', err.message);
  }
}

module.exports = { registrarAuditoria };
