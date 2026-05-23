const axios = require('axios');
const { Usuario } = require('../models');

const FROM_NAME = 'Soporte TI ISTHO';
const FROM_EMAIL = process.env.EMAIL_FROM || 'liderti@istho.com.co';

if (process.env.SENDGRID_API_KEY) {
  console.log('[email] SendGrid configurado OK — remitente:', FROM_EMAIL);
} else {
  console.warn('[email] SENDGRID_API_KEY no configurada — los correos no se enviarán');
}

async function getItRecipients() {
  const usuarios = await Usuario.findAll({
    where: { activo: true },
    attributes: ['email', 'nombre', 'rol'],
  });
  return usuarios
    .filter(u => ['admin', 'tecnico'].includes(u.rol) && u.email)
    .map(u => ({ email: u.email, name: u.nombre }));
}

const PRIORIDAD_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
const ESTADO_LABEL = {
  abierto: 'Abierto', en_proceso: 'En proceso', pendiente_usuario: 'Pendiente usuario',
  pendiente_externo: 'Pendiente externo', resuelto: 'Resuelto', cerrado: 'Cerrado', cancelado: 'Cancelado',
};

function baseHtml(title, body) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body{font-family:Segoe UI,Arial,sans-serif;background:#f1f5f9;margin:0;padding:20px}
  .card{background:#fff;border-radius:12px;max-width:600px;margin:0 auto;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .header{background:#1B2340;padding:24px 32px;color:#fff}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:4px 0 0;font-size:13px;opacity:.7}
  .body{padding:28px 32px}
  .row{display:flex;gap:8px;margin-bottom:12px;align-items:flex-start}
  .label{font-size:12px;font-weight:600;color:#64748b;min-width:130px;text-transform:uppercase;letter-spacing:.5px;padding-top:2px}
  .value{font-size:14px;color:#1e293b;flex:1}
  .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600}
  .badge-critica{background:#ede9fe;color:#6d28d9}
  .badge-alta{background:#fee2e2;color:#b91c1c}
  .badge-media{background:#fef3c7;color:#b45309}
  .badge-baja{background:#dbeafe;color:#1d4ed8}
  .badge-abierto{background:#dbeafe;color:#1d4ed8}
  .badge-en_proceso{background:#fef3c7;color:#b45309}
  .badge-resuelto{background:#dcfce7;color:#166534}
  .badge-cerrado{background:#f1f5f9;color:#475569}
  .badge-cancelado{background:#fee2e2;color:#b91c1c}
  .desc{background:#f8fafc;border-radius:8px;padding:14px 16px;font-size:14px;color:#334155;margin-top:4px;line-height:1.6}
  .footer{background:#f8fafc;padding:14px 32px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0}
  .divider{border:none;border-top:1px solid #e2e8f0;margin:18px 0}
</style></head>
<body><div class="card">
  <div class="header"><h1>Soporte TI — ISTHO S.A.S.</h1><p>${title}</p></div>
  <div class="body">${body}</div>
  <div class="footer">Este es un mensaje automático del sistema de soporte TI · ISTHO S.A.S.</div>
</div></body></html>`;
}

async function _send({ to, subject, html }) {
  if (!process.env.SENDGRID_API_KEY) return;

  const toList = (Array.isArray(to) ? to : [to]).map(r =>
    typeof r === 'string' ? { email: r } : r
  );

  try {
    await axios.post('https://api.sendgrid.com/v3/mail/send', {
      personalizations: [{ to: toList }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [{ type: 'text/html', value: html }],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`${err.response?.status || ''} ${detail}`);
  }
}

async function notificarNuevaSolicitud(solicitud, empleado) {
  const recipients = await getItRecipients();
  if (!recipients.length) return;

  await _send({
    to: recipients,
    subject: `[SIST] Nueva solicitud ${solicitud.numero} — ${PRIORIDAD_LABEL[solicitud.prioridad]} — ${empleado.nombreCompleto}`,
    html: baseHtml('Nueva solicitud de soporte recibida', `
      <p style="margin:0 0 18px;font-size:15px;color:#1e293b">Se ha creado una nueva solicitud de soporte:</p>
      <div class="row"><span class="label">Número</span><span class="value" style="font-family:monospace;font-weight:700;color:#E8531E">${solicitud.numero}</span></div>
      <div class="row"><span class="label">Empleado</span><span class="value">${empleado.nombreCompleto}</span></div>
      <div class="row"><span class="label">Área</span><span class="value">${empleado.area}${empleado.cargo ? ' — ' + empleado.cargo : ''}</span></div>
      ${empleado.telefono ? `<div class="row"><span class="label">Teléfono</span><span class="value">${empleado.telefono}</span></div>` : ''}
      <div class="row"><span class="label">Tipo</span><span class="value">${solicitud.tipoSolicitud.replace(/_/g, ' ')}</span></div>
      <div class="row"><span class="label">Prioridad</span><span class="value"><span class="badge badge-${solicitud.prioridad}">${PRIORIDAD_LABEL[solicitud.prioridad]}</span></span></div>
      <hr class="divider">
      <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Descripción</div>
      <div class="desc">${solicitud.descripcion}</div>
    `),
  });
}

async function notificarConfirmacionEmpleado(solicitud, empleado) {
  if (!empleado.email) return;

  await _send({
    to: { email: empleado.email, name: empleado.nombreCompleto },
    subject: `[SIST] Ticket ${solicitud.numero} recibido — Soporte TI ISTHO`,
    html: baseHtml('Confirmación de tu solicitud de soporte', `
      <p style="margin:0 0 18px;font-size:15px;color:#1e293b">Hola <strong>${empleado.nombreCompleto}</strong>,</p>
      <p style="margin:0 0 18px;font-size:14px;color:#334155">Tu solicitud de soporte ha sido recibida exitosamente. El equipo de TI la atenderá a la brevedad.</p>
      <div class="row"><span class="label">Número de ticket</span><span class="value" style="font-family:monospace;font-weight:700;color:#E8531E">${solicitud.numero}</span></div>
      <div class="row"><span class="label">Tipo</span><span class="value">${solicitud.tipoSolicitud.replace(/_/g, ' ')}</span></div>
      <div class="row"><span class="label">Prioridad</span><span class="value"><span class="badge badge-${solicitud.prioridad}">${PRIORIDAD_LABEL[solicitud.prioridad]}</span></span></div>
      <hr class="divider">
      <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Tu descripción</div>
      <div class="desc">${solicitud.descripcion}</div>
      <p style="margin:18px 0 0;font-size:13px;color:#64748b">Guarda este número de ticket para hacer seguimiento a tu solicitud.</p>
    `),
  });
}

async function notificarCambioEstado(solicitud, empleado, estadoAnterior, estadoNuevo, comentario) {
  if (!empleado?.email) return;

  await _send({
    to: { email: empleado.email, name: empleado.nombreCompleto },
    subject: `[SIST] Ticket ${solicitud.numero} — Estado actualizado: ${ESTADO_LABEL[estadoNuevo] || estadoNuevo}`,
    html: baseHtml('Actualización en tu solicitud de soporte', `
      <p style="margin:0 0 18px;font-size:15px;color:#1e293b">Hola <strong>${empleado.nombreCompleto}</strong>,</p>
      <p style="margin:0 0 18px;font-size:14px;color:#334155">El estado de tu solicitud ha sido actualizado:</p>
      <div class="row"><span class="label">Ticket</span><span class="value" style="font-family:monospace;font-weight:700;color:#E8531E">${solicitud.numero}</span></div>
      <div class="row"><span class="label">Estado anterior</span><span class="value"><span class="badge badge-${estadoAnterior}">${ESTADO_LABEL[estadoAnterior] || estadoAnterior}</span></span></div>
      <div class="row"><span class="label">Nuevo estado</span><span class="value"><span class="badge badge-${estadoNuevo}">${ESTADO_LABEL[estadoNuevo] || estadoNuevo}</span></span></div>
      ${comentario ? `<hr class="divider"><div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Comentario del técnico</div><div class="desc">${comentario}</div>` : ''}
      <p style="margin:18px 0 0;font-size:13px;color:#64748b">Si tienes dudas, comunícate con el área de TI.</p>
    `),
  });
}

module.exports = { notificarNuevaSolicitud, notificarConfirmacionEmpleado, notificarCambioEstado };
