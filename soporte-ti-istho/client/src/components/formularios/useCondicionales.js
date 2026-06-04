import { useMemo } from 'react';

function evaluar(condicion, valores) {
  if (!condicion || !condicion.reglas || condicion.reglas.length === 0) return true;
  const resultados = condicion.reglas.map(regla => {
    const val = valores[regla.campoId];
    const str = Array.isArray(val) ? val.join(', ') : String(val ?? '');
    switch (regla.operador) {
      case 'igual':         return str === String(regla.valor ?? '');
      case 'diferente':     return str !== String(regla.valor ?? '');
      case 'contiene':      return Array.isArray(val)
        ? val.includes(regla.valor)
        : str.includes(String(regla.valor ?? ''));
      case 'no_contiene':   return Array.isArray(val)
        ? !val.includes(regla.valor)
        : !str.includes(String(regla.valor ?? ''));
      case 'esta_vacio':    return !val
        || (Array.isArray(val) && val.length === 0)
        || str === '';
      case 'no_esta_vacio': return !!val
        && !(Array.isArray(val) && val.length === 0)
        && str !== '';
      default: return true;
    }
  });
  return condicion.operadorLogico === 'O'
    ? resultados.some(Boolean)
    : resultados.every(Boolean);
}

export function useCondicionales(campos, secciones, valores) {
  const camposVisibles = useMemo(() => {
    const set = new Set();
    for (const campo of campos) {
      if (!campo.condiciones || evaluar(campo.condiciones, valores)) {
        set.add(campo.id);
      }
    }
    return set;
  }, [campos, secciones, valores]);

  const seccionesVisibles = useMemo(() => {
    const set = new Set();
    for (const sec of secciones) {
      if (!sec.condiciones || evaluar(sec.condiciones, valores)) {
        set.add(sec.id);
      }
    }
    return set;
  }, [secciones, valores]);

  return { camposVisibles, seccionesVisibles };
}
