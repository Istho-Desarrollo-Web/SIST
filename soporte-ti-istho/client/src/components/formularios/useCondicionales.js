import { useMemo } from 'react';

function evaluar(condicion, valores) {
  if (!condicion || !condicion.reglas || condicion.reglas.length === 0) return true;
  const resultados = condicion.reglas.map(regla => {
    const val = valores[regla.campoId];
    const str = Array.isArray(val) ? val.join(', ') : String(val ?? '');
    const reglVal = String(regla.valor ?? '');
    switch (regla.operador) {
      case 'igual':
        return Array.isArray(val) ? val.includes(regla.valor) : str === reglVal;
      case 'diferente':
        return Array.isArray(val) ? !val.includes(regla.valor) : str !== reglVal;
      case 'contiene':
        return Array.isArray(val)
          ? val.includes(regla.valor)
          : str.includes(reglVal);
      case 'no_contiene':
        return Array.isArray(val)
          ? !val.includes(regla.valor)
          : !str.includes(reglVal);
      case 'esta_vacio':
        return val === null || val === undefined || val === ''
          || (Array.isArray(val) && val.length === 0);
      case 'no_esta_vacio':
        return val !== null && val !== undefined && val !== ''
          && !(Array.isArray(val) && val.length === 0);
      default:
        return true;
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
  }, [campos, valores]);

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
