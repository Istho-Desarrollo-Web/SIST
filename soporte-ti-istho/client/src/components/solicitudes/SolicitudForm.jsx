import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { solicitudService } from '../../services/solicitudService';
import { empleadoService } from '../../services/empleadoService';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { FileUploadZone } from '../common/FileUploadZone';
import { TIPOS_SOLICITUD_LABEL, PRIORIDADES_LABEL } from '../../utils/constants';

const schema = z.object({
  empleado_id: z.coerce.number().min(1, 'Selecciona un empleado'),
  tipoSolicitud: z.string().min(1, 'Selecciona el tipo'),
  prioridad: z.enum(['critica', 'alta', 'media', 'baja']),
  descripcion: z.string().min(10, 'Descripción muy corta (mínimo 10 caracteres)'),
});

export function SolicitudForm({ onClose, onCreated }) {
  const [busqueda, setBusqueda] = useState('');
  const [empleado, setEmpleado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [archivos, setArchivos] = useState([]);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { prioridad: 'media' },
  });

  const buscarEmpleado = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    try {
      const res = await empleadoService.buscar(busqueda.trim());
      const emp = res.data.data;
      setEmpleado(emp);
      setValue('empleado_id', emp.id);
    } catch {
      toast.error('Empleado no encontrado');
      setEmpleado(null);
    } finally {
      setBuscando(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => form.append(k, v));
      archivos.forEach(f => form.append('archivos', f));
      await solicitudService.crear(form);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear la solicitud');
    }
  };

  return (
    <Modal open onClose={onClose} title="Nueva Solicitud" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Buscar empleado */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Empleado solicitante
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Número de identificación..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarEmpleado())}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            <Button type="button" variant="secondary" size="md" loading={buscando} onClick={buscarEmpleado}>
              <Search size={15} />
            </Button>
          </div>
          {empleado && (
            <div className="mt-2 p-3 bg-cgreen-50 dark:bg-cgreen-900/20 rounded-lg border border-cgreen-200 dark:border-cgreen-800 text-sm">
              <p className="font-semibold text-cgreen-800 dark:text-cgreen-300">{empleado.nombreCompleto}</p>
              <p className="text-cgreen-600 dark:text-cgreen-400">{empleado.area} — {empleado.cargo}</p>
            </div>
          )}
          {errors.empleado_id && <p className="text-xs text-red-500 mt-1">{errors.empleado_id.message}</p>}
          <input type="hidden" {...register('empleado_id')} />
        </div>

        {/* Tipo */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de solicitud</label>
          <select
            {...register('tipoSolicitud')}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <option value="">Seleccionar...</option>
            {Object.entries(TIPOS_SOLICITUD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {errors.tipoSolicitud && <p className="text-xs text-red-500">{errors.tipoSolicitud.message}</p>}
        </div>

        {/* Prioridad */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Prioridad</label>
          <select
            {...register('prioridad')}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            {Object.entries(PRIORIDADES_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción del problema</label>
          <textarea
            {...register('descripcion')}
            rows={4}
            placeholder="Describe el problema con el mayor detalle posible..."
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
          />
          {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
        </div>

        {/* Archivos */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Archivos adjuntos <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <FileUploadZone files={archivos} onChange={setArchivos} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>Crear Solicitud</Button>
        </div>
      </form>
    </Modal>
  );
}
