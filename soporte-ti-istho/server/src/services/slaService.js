const { SLA_CONFIG, FESTIVOS_COLOMBIA_2026, HORARIO_ISTHO } = require('../utils/constants');

function esFestivo(date) {
  const str = date.toISOString().split('T')[0];
  return FESTIVOS_COLOMBIA_2026.includes(str);
}

function esDiaHabil(date) {
  const dow = date.getDay(); // 0=dom, 6=sab
  if (dow === 0) return false;
  if (esFestivo(date)) return false;
  return true;
}

function esSabadoHabil(date) {
  return date.getDay() === 6 && !esFestivo(date);
}

/**
 * Agrega minutosHabiles al date de inicio respetando horario ISTHO.
 * L-V 08:00-17:00, Sáb 08:00-12:00, sin domingos ni festivos.
 */
function agregarMinutosHabiles(inicio, minutosHabiles) {
  let current = new Date(inicio);
  let restantes = minutosHabiles;

  // Avanzar al siguiente momento hábil si el inicio no lo es
  current = avanzarAHoraHabil(current);

  while (restantes > 0) {
    const dow = current.getDay();
    const hora = current.getHours() + current.getMinutes() / 60;

    let finDia;
    if (dow >= 1 && dow <= 5 && !esFestivo(current)) {
      finDia = HORARIO_ISTHO.lunesViernes.fin;
    } else if (dow === 6 && !esFestivo(current)) {
      finDia = HORARIO_ISTHO.sabado.fin;
    } else {
      current = avanzarAHoraHabil(new Date(current.getTime() + 60000));
      continue;
    }

    const minutosRestantesDia = Math.max(0, (finDia - hora) * 60);

    if (restantes <= minutosRestantesDia) {
      current = new Date(current.getTime() + restantes * 60000);
      restantes = 0;
    } else {
      restantes -= minutosRestantesDia;
      // Pasar al inicio del siguiente día hábil
      current = siguienteDiaHabil(current);
    }
  }

  return current;
}

function avanzarAHoraHabil(date) {
  let d = new Date(date);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const dow = d.getDay();
    const festivo = esFestivo(d);

    if (dow === 0 || festivo) {
      d = inicioDelDia(d, 1);
      continue;
    }

    const hora = d.getHours() + d.getMinutes() / 60;
    let ini, fin;

    if (dow >= 1 && dow <= 5) {
      ini = HORARIO_ISTHO.lunesViernes.inicio;
      fin = HORARIO_ISTHO.lunesViernes.fin;
    } else {
      // sábado
      ini = HORARIO_ISTHO.sabado.inicio;
      fin = HORARIO_ISTHO.sabado.fin;
    }

    if (hora < ini) {
      d.setHours(ini, 0, 0, 0);
      break;
    }
    if (hora >= fin) {
      d = inicioDelDia(d, 1);
      continue;
    }
    break;
  }

  return d;
}

function siguienteDiaHabil(date) {
  let d = inicioDelDia(date, 1);
  while (true) {
    const dow = d.getDay();
    if (dow === 0 || esFestivo(d)) {
      d = inicioDelDia(d, 1);
      continue;
    }
    const ini = dow === 6 ? HORARIO_ISTHO.sabado.inicio : HORARIO_ISTHO.lunesViernes.inicio;
    d.setHours(ini, 0, 0, 0);
    break;
  }
  return d;
}

function inicioDelDia(date, offset = 0) {
  const d = new Date(date);
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calcula las fechas límite de respuesta y resolución según la prioridad.
 * @param {Date} fechaCreacion
 * @param {'critica'|'alta'|'media'|'baja'} prioridad
 * @returns {{ fechaLimiteRespuesta: Date, fechaLimiteResolucion: Date }}
 */
function calcularFechasSLA(fechaCreacion, prioridad) {
  const config = SLA_CONFIG[prioridad];
  const inicio = new Date(fechaCreacion);

  if (config.tipo === 'natural') {
    return {
      fechaLimiteRespuesta: new Date(inicio.getTime() + config.respuesta * 60000),
      fechaLimiteResolucion: new Date(inicio.getTime() + config.resolucion * 60000),
    };
  }

  return {
    fechaLimiteRespuesta: agregarMinutosHabiles(inicio, config.respuesta),
    fechaLimiteResolucion: agregarMinutosHabiles(inicio, config.resolucion),
  };
}

/**
 * Calcula el porcentaje de SLA consumido.
 * 0% = recién creado, 100% = en el límite, >100% = vencido.
 */
function calcularPorcentajeSLA(fechaCreacion, fechaLimiteResolucion, fechaResolucion) {
  const fin = fechaResolucion ? new Date(fechaResolucion) : new Date();
  const total = new Date(fechaLimiteResolucion) - new Date(fechaCreacion);
  const usado = fin - new Date(fechaCreacion);
  return Math.round((usado / total) * 10000) / 100;
}

module.exports = { calcularFechasSLA, calcularPorcentajeSLA, agregarMinutosHabiles };
