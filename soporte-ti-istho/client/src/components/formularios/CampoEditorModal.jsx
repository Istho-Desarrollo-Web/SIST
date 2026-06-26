import { useForm, Controller } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';

function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
  }
  return [];
}

const TIPOS_TRIGGER = ['seleccion_unica', 'seleccion_multiple', 'texto_corto', 'numero'];

const OPERADORES = [
  { value: 'igual',         label: 'es igual a' },
  { value: 'diferente',     label: 'es diferente a' },
  { value: 'contiene',      label: 'contiene' },
  { value: 'no_contiene',   label: 'no contiene' },
  { value: 'esta_vacio',    label: 'está vacío' },
  { value: 'no_esta_vacio', label: 'no está vacío' },
];

function ReglaRow({ regla, camposDisponibles, onChange, onDelete }) {
  const campoSeleccionado = camposDisponibles.find(
    c => String(c.id) === String(regla.campoId)
  );
  const opcionesValor = campoSeleccionado ? toArray(campoSeleccionado.opciones) : [];
  const mostrarValor = !['esta_vacio', 'no_esta_vacio'].includes(regla.operador);

  return (
    <div className="flex flex-wrap items-start gap-1.5 p-2 rounded bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-600">
      <Select
        value={String(regla.campoId || '')}
        onChange={v => onChange({ ...regla, campoId: v, valor: '' })}
        options={[{ value: '', label: 'Campo...' }, ...camposDisponibles.map(c => ({ value: String(c.id), label: c.etiqueta }))]}
        placeholder="Campo..."
      />

      <Select
        value={regla.operador}
        onChange={v => onChange({ ...regla, operador: v })}
        options={OPERADORES.map(op => ({ value: op.value, label: op.label }))}
        placeholder="Operador..."
      />

      {mostrarValor && (
        opcionesValor.length > 0 ? (
          <Select
            value={regla.valor || ''}
            onChange={v => onChange({ ...regla, valor: v })}
            options={[{ value: '', label: 'Valor...' }, ...opcionesValor.map(op => ({ value: op, label: op }))]}
            placeholder="Valor..."
          />
        ) : (
          <input
            type="text"
            value={regla.valor || ''}
            onChange={e => onChange({ ...regla, valor: e.target.value })}
            placeholder="Valor..."
            className="flex-1 min-w-[100px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          />
        )
      )}

      <button type="button" onClick={onDelete} className="text-slate-400 hover:text-red-500 p-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

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

export function CampoEditorModal({ isOpen, onClose, onSave, campoInicial, camposDelFormulario = [] }) {
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
  const [condiciones, setCondiciones] = useState(null);
  const [panelCondicionesVisible, setPanelCondicionesVisible] = useState(false);
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
      if (campoInicial?.condiciones) {
        let cond = campoInicial.condiciones;
        if (typeof cond === 'string') { try { cond = JSON.parse(cond); } catch { cond = null; } }
        if (cond && Array.isArray(cond.reglas)) {
          setCondiciones(cond);
          setPanelCondicionesVisible(true);
        }
      } else {
        setCondiciones(null);
        setPanelCondicionesVisible(false);
      }
    } else {
      reset({ tipo: 'texto_corto', etiqueta: '', descripcion: '', placeholder: '', requerido: false, opciones: [] });
      setOpciones([]);
      setGrillaColumnas(['B', 'R', 'M', 'N/A']);
      setGrillaFilas(['Fila 1']);
      setConObservaciones(false);
      setCondiciones(null);
      setPanelCondicionesVisible(false);
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
    onSave({ ...data, opciones: opcionesFinales, condiciones: condiciones || null });
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

        {/* Panel visibilidad condicional */}
        {(() => {
          const camposDisponibles = camposDelFormulario.filter(
            c => c.id && TIPOS_TRIGGER.includes(c.tipo)
          );
          return (
            <div className="border border-slate-200 dark:border-navy-600 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setPanelCondicionesVisible(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-navy-900 hover:bg-slate-100 dark:hover:bg-navy-700"
              >
                <span className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5" />
                  Visibilidad condicional
                </span>
                {panelCondicionesVisible
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {panelCondicionesVisible && (
                <div className="p-3 flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!condiciones}
                      onChange={e => setCondiciones(
                        e.target.checked ? { operadorLogico: 'Y', reglas: [] } : null
                      )}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                    />
                    Activar visibilidad condicional
                  </label>

                  {condiciones && (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Mostrar si se cumplen</span>
                        <Select
                          value={condiciones.operadorLogico}
                          onChange={v => setCondiciones({ ...condiciones, operadorLogico: v })}
                          options={[{ value: 'Y', label: 'TODAS las reglas' }, { value: 'O', label: 'ALGUNA regla' }]}
                          placeholder="Operador lógico..."
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">siguientes reglas:</span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {(condiciones.reglas ?? []).map((regla, idx) => (
                          <ReglaRow
                            key={idx}
                            regla={regla}
                            camposDisponibles={camposDisponibles}
                            onChange={r => {
                              const reglas = [...(condiciones.reglas ?? [])];
                              reglas[idx] = r;
                              setCondiciones({ ...condiciones, reglas });
                            }}
                            onDelete={() => {
                              const reglas = (condiciones.reglas ?? []).filter((_, i) => i !== idx);
                              setCondiciones({ ...condiciones, reglas });
                            }}
                          />
                        ))}
                        {(condiciones.reglas ?? []).length === 0 && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                            Sin reglas — el campo siempre será visible
                          </p>
                        )}
                      </div>

                      {(condiciones.reglas ?? []).length < 10 && camposDisponibles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCondiciones({
                            ...condiciones,
                            reglas: [...(condiciones.reglas ?? []), { campoId: '', operador: 'igual', valor: '' }],
                          })}
                          className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 self-start"
                        >
                          <Plus className="w-3 h-3" />
                          Agregar regla
                        </button>
                      )}

                      {camposDisponibles.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Guarda primero los demás campos para poder referenciarlos en reglas.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })()}

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
