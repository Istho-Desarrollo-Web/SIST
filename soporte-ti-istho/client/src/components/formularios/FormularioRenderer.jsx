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

export function FormularioRenderer({ campos = [], secciones = [], valores = {}, onChange, disabled, camposVisibles, seccionesVisibles }) {
  function handleChange(campoId, value) {
    if (onChange) onChange({ ...valores, [campoId]: value });
  }

  const camposFiltrados   = camposVisibles    ? campos.filter(c => camposVisibles.has(c.id))    : campos;
  const seccionesFiltradas = seccionesVisibles ? secciones.filter(s => seccionesVisibles.has(s.id)) : secciones;

  // Sin secciones: comportamiento original
  if (seccionesFiltradas.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {camposFiltrados.map(campo => (
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
  const seccionMap = new Map(seccionesFiltradas.map(s => [s.id, s]));

  const groups = [];

  // Secciones con header visible: render colapsable
  const seccionesConHeader = seccionesFiltradas.filter(s => s.visibleParaUsuario);
  for (const sec of seccionesConHeader) {
    const secCampos = camposFiltrados
      .filter(c => c.seccionId === sec.id)
      .sort((a, b) => a.orden - b.orden);
    if (secCampos.length > 0) {
      groups.push({ tipo: 'visible', seccion: sec, campos: secCampos });
    }
  }

  // Secciones no visibles: campos flat sin encabezado
  const seccionesOcultas = seccionesFiltradas.filter(s => !s.visibleParaUsuario);
  const camposOcultos = camposFiltrados.filter(c =>
    c.seccionId && seccionesOcultas.some(s => s.id === c.seccionId)
  ).sort((a, b) => a.orden - b.orden);
  if (camposOcultos.length > 0) {
    groups.push({ tipo: 'oculto', campos: camposOcultos });
  }

  // Sin sección
  const camposSinSeccion = camposFiltrados
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

function CampoGrilla({ campo, value, onChange, disabled }) {
  let rawOpts = campo.opciones;
  if (typeof rawOpts === 'string') {
    try { rawOpts = JSON.parse(rawOpts); } catch { rawOpts = {}; }
  }
  const opts = (rawOpts && typeof rawOpts === 'object' && !Array.isArray(rawOpts)) ? rawOpts : {};
  const columnas = Array.isArray(opts.columnas) ? opts.columnas : [];
  const filas = Array.isArray(opts.filas) ? opts.filas : [];
  const conObs = Boolean(opts.conObservaciones);

  if (filas.length === 0 || columnas.length === 0) {
    return (
      <div>
        <span className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {campo.etiqueta}
          {campo.requerido && <span className="text-orange-500">*</span>}
        </span>
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-navy-600 px-4 py-3 text-xs text-center text-slate-400 dark:text-slate-500">
          Campo de tabla sin filas o columnas configuradas.
        </div>
      </div>
    );
  }

  const entries = Array.isArray(value) ? value : [];

  function getEntry(filaIdx) {
    return entries.find(e => e.fila === filaIdx) || { fila: filaIdx, columna: null, observacion: '' };
  }

  function setEntry(filaIdx, patch) {
    const next = filas.map((_, idx) => {
      const e = getEntry(idx);
      return idx === filaIdx ? { ...e, ...patch } : e;
    });
    onChange(next);
  }

  return (
    <div>
      <span className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {campo.etiqueta}
        {campo.requerido && <span className="text-orange-500">*</span>}
      </span>
      {campo.descripcion && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{campo.descripcion}</p>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-navy-600">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 bg-slate-100 dark:bg-navy-700 border-b border-slate-200 dark:border-navy-600 font-medium text-slate-600 dark:text-slate-300 text-xs min-w-[140px]" />
              {columnas.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 bg-slate-100 dark:bg-navy-700 border-b border-slate-200 dark:border-navy-600 font-medium text-slate-600 dark:text-slate-300 text-xs text-center whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
              {conObs && (
                <th className="px-3 py-2 bg-slate-100 dark:bg-navy-700 border-b border-slate-200 dark:border-navy-600 font-medium text-slate-600 dark:text-slate-300 text-xs text-left whitespace-nowrap min-w-[160px]">
                  Observaciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, filaIdx) => {
              const entry = getEntry(filaIdx);
              return (
                <tr
                  key={filaIdx}
                  className={filaIdx % 2 === 0
                    ? 'bg-white dark:bg-navy-800'
                    : 'bg-slate-50 dark:bg-navy-900'}
                >
                  <td className="px-3 py-2 border-b border-slate-100 dark:border-navy-700 text-slate-700 dark:text-slate-300 text-xs">
                    {fila}
                  </td>
                  {columnas.map(col => (
                    <td
                      key={col}
                      className="px-3 py-2 border-b border-slate-100 dark:border-navy-700 text-center"
                    >
                      <input
                        type="radio"
                        name={`grilla-${campo.id}-fila${filaIdx}`}
                        checked={entry.columna === col}
                        onChange={() => setEntry(filaIdx, { columna: col })}
                        disabled={disabled}
                        className="h-4 w-4 text-orange-500 focus:ring-orange-500 cursor-pointer"
                        title={col}
                      />
                    </td>
                  ))}
                  {conObs && (
                    <td className="px-3 py-2 border-b border-slate-100 dark:border-navy-700">
                      <input
                        type="text"
                        value={entry.observacion || ''}
                        onChange={e => setEntry(filaIdx, { observacion: e.target.value })}
                        disabled={disabled}
                        placeholder="Observación..."
                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500/50 disabled:opacity-60"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

  if (campo.tipo === 'grilla') {
    return (
      <CampoGrilla
        campo={campo}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  return null;
}
