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
  const tipo = watch('tipo');

  useEffect(() => {
    if (campoInicial) {
      reset(campoInicial);
      setOpciones(campoInicial.opciones || []);
    } else {
      reset({ tipo: 'texto_corto', etiqueta: '', descripcion: '', placeholder: '', requerido: false, opciones: [] });
      setOpciones([]);
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
    onSave({ ...data, opciones: ['seleccion_unica', 'seleccion_multiple'].includes(data.tipo) ? opciones : undefined });
    onClose();
  }

  const necesitaOpciones = ['seleccion_unica', 'seleccion_multiple'].includes(tipo);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={campoInicial ? 'Editar campo' : 'Nuevo campo'}>
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
