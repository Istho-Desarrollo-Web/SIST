import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { FileUploadZone } from '../common/FileUploadZone';
import { FirmaCanvas } from './FirmaCanvas';

const TIPO_LABELS = {
  texto_corto: 'Texto corto',
  texto_largo: 'Texto largo',
  numero: 'Número',
  fecha: 'Fecha',
  seleccion_unica: 'Selección única',
  seleccion_multiple: 'Selección múltiple',
  archivo: 'Archivo',
  firma: 'Firma',
};

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

export function FormularioRenderer({ campos = [], valores = {}, onChange, disabled }) {
  function handleChange(campoId, value) {
    if (onChange) onChange({ ...valores, [campoId]: value });
  }

  return (
    <div className="flex flex-col gap-5">
      {campos.map((campo) => (
        <CampoInput
          key={campo.id}
          campo={campo}
          value={valores[campo.id] ?? ''}
          onChange={(v) => handleChange(campo.id, v)}
          disabled={disabled}
        />
      ))}
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
        <DatePicker
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }

  if (campo.tipo === 'seleccion_unica') {
    const opciones = toArray(campo.opciones).map((o) => ({ value: o, label: o }));
    return (
      <div>
        {label}
        <Select
          value={value}
          onChange={onChange}
          options={opciones}
          placeholder="Seleccionar..."
          disabled={disabled}
        />
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
        <FileUploadZone
          onFileSelect={(file) => onChange(file)}
          disabled={disabled}
          accept="*/*"
          maxFiles={1}
        />
      </div>
    );
  }

  if (campo.tipo === 'firma') {
    return (
      <div>
        {label}
        {campo.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{campo.descripcion}</p>}
        <FirmaCanvas
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }

  return null;
}
