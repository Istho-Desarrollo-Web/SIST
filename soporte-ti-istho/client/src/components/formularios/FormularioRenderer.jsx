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
