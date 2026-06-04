import { useForm, Controller } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';

const TIPOS = [
  { value: 'texto_corto', label: 'Texto corto' },
  { value: 'texto_largo', label: 'Texto largo' },
  { value: 'numero', label: 'Número' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'seleccion_unica', label: 'Selección única' },
  { value: 'seleccion_multiple', label: 'Selección múltiple' },
  { value: 'archivo', label: 'Archivo adjunto' },
  { value: 'firma', label: 'Firma digital' },
  { value: 'grilla', label: 'Grilla de calificación' },
];

export function CampoEditorModal({ isOpen, onClose, onSave, campoInicial }) {
  const { register, handleSubmit, control, watch, reset, setValue } = useForm({
    defaultValues: {
      tipo: 'texto_corto',
      etiqueta: '',
      descripcion: '',
      placeholder: '',
      requerido: false,
      opciones: [],
    },
  });

  const [nuevaOpcion, setNuevaOpcion] = useState('');
  const [opciones, setOpciones] = useState([]);
  const [grillaColumnas, setGrillaColumnas] = useState(['B', 'R', 'M', 'N/A']);
  const [grillaFilas, setGrillaFilas] = useState(['Fila 1']);
  const [conObservaciones, setConObservaciones] = useState(false);
  const tipo = watch('tipo');

  useEffect(() => {
    if (campoInicial) {
      reset(campoInicial);
      const raw = campoInicial.opciones;
      if (campoInicial.tipo === 'grilla' && raw && typeof raw === 'object' && !Array.isArray(raw)) {
        setGrillaColumnas(Array.isArray(raw.columnas) ? raw.columnas : ['B', 'R', 'M', 'N/A']);
        setGrillaFilas(Array.isArray(raw.filas) ? raw.filas : ['Fila 1']);
        setConObservaciones(Boolean(raw.conObservaciones));
        setOpciones([]);
      } else {
        let parsed = [];
        if (Array.isArray(raw)) parsed = raw;
        else if (typeof raw === 'string') {
          try { const r = JSON.parse(raw); if (Array.isArray(r)) parsed = r; } catch { /* noop */ }
        }
        setOpciones(parsed);
        setGrillaColumnas(['B', 'R', 'M', 'N/A']);
        setGrillaFilas(['Fila 1']);
        setConObservaciones(false);
      }
    } else {
      reset({ tipo: 'texto_corto', etiqueta: '', descripcion: '', placeholder: '', requerido: false, opciones: [] });
      setOpciones([]);
      setGrillaColumnas(['B', 'R', 'M', 'N/A']);
      setGrillaFilas(['Fila 1']);
      setConObservaciones(false);
    }
  }, [campoInicial, reset, isOpen]);

  function agregarOpcion() {
    const trimmed = nuevaOpcion.trim();
    if (!trimmed || opciones.includes(trimmed)) return;
    const next = [...opciones, trimmed];
    setOpciones(next);
    setValue('opciones', next);
    setNuevaOpcion('');
  }

  function eliminarOpcion(idx) {
    const next = opciones.filter((_, i) => i !== idx);
    setOpciones(next);
    setValue('opciones', next);
  }

  function onSubmit(data) {
    let opcionesFinales;
    if (['seleccion_unica', 'seleccion_multiple'].includes(data.tipo)) {
      opcionesFinales = opciones;
    } else if (data.tipo === 'grilla') {
      opcionesFinales = { columnas: grillaColumnas, filas: grillaFilas, conObservaciones };
    } else {
      opcionesFinales = undefined;
    }
    onSave({ ...data, opciones: opcionesFinales });
    onClose();
  }

  const necesitaOpciones = ['seleccion_unica', 'seleccion_multiple'].includes(tipo);
  const esGrilla = tipo === 'grilla';

  return (
    <Modal open={isOpen} onClose={onClose} title={campoInicial ? 'Editar campo' : 'Nuevo campo'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Controller
          name="tipo"
          control={control}
          render={({ field }) => (
            <Select
              label="Tipo de campo"
              value={field.value}
              onChange={field.onChange}
              options={TIPOS}
              placeholder="Seleccionar tipo..."
            />
          )}
        />

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
            Etiqueta <span className="text-orange-500">*</span>
          </label>
          <Input {...register('etiqueta', { required: true })} placeholder="Ej: Nombre completo" />
        </div>

        <Input
          label="Descripción (opcional)"
          {...register('descripcion')}
          placeholder="Instrucciones adicionales para el usuario"
        />

        {['texto_corto', 'numero'].includes(tipo) && (
          <Input
            label="Placeholder (opcional)"
            {...register('placeholder')}
            placeholder="Texto de ejemplo"
          />
        )}

        {necesitaOpciones && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
              Opciones
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={nuevaOpcion}
                onChange={(e) => setNuevaOpcion(e.target.value)}
                placeholder="Nueva opción..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarOpcion(); } }}
                className="flex-1"
              />
              <Button type="button" onClick={agregarOpcion} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {opciones.map((op, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-navy-700 text-xs text-slate-700 dark:text-slate-300"
                >
                  {op}
                  <button type="button" onClick={() => eliminarOpcion(i)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {esGrilla && (
          <>
            {/* Panel Columnas */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                Columnas ({grillaColumnas.length}/8)
              </label>
              <div className="flex flex-col gap-1.5 mb-2">
                {grillaColumnas.map((col, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={col}
                      onChange={e => {
                        const next = [...grillaColumnas];
                        next[i] = e.target.value;
                        setGrillaColumnas(next);
                      }}
                      className="flex-1"
                      placeholder={`Columna ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => setGrillaColumnas(grillaColumnas.filter((_, j) => j !== i))}
                      disabled={grillaColumnas.length <= 1}
                      className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {grillaColumnas.length < 8 && (
                <button
                  type="button"
                  onClick={() => setGrillaColumnas([...grillaColumnas, ''])}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Agregar columna
                </button>
              )}
            </div>

            {/* Panel Filas */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                Filas ({grillaFilas.length}/50)
              </label>
              <div className="flex flex-col gap-1.5 mb-2">
                {grillaFilas.map((fila, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={fila}
                      onChange={e => {
                        const next = [...grillaFilas];
                        next[i] = e.target.value;
                        setGrillaFilas(next);
                      }}
                      className="flex-1"
                      placeholder={`Fila ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => setGrillaFilas(grillaFilas.filter((_, j) => j !== i))}
                      disabled={grillaFilas.length <= 1}
                      className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {grillaFilas.length < 50 && (
                <button
                  type="button"
                  onClick={() => setGrillaFilas([...grillaFilas, ''])}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Agregar fila
                </button>
              )}
            </div>

            {/* Toggle observaciones */}
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={conObservaciones}
                onChange={e => setConObservaciones(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              Columna de observaciones
            </label>
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" {...register('requerido')} className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
          Campo requerido
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {campoInicial ? 'Guardar cambios' : 'Agregar campo'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
