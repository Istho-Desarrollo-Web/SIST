import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { solicitudService } from '../../services/solicitudService';
import { empleadoService } from '../../services/empleadoService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
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

  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm({
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
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="cx-field">
          <label className="cx-label">Empleado solicitante</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Número de identificación..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarEmpleado())}
              className="cx-input"
              style={{ flex: 1 }}
            />
            <Button type="button" variant="secondary" size="md" loading={buscando} onClick={buscarEmpleado}>
              <Search size={15} />
            </Button>
          </div>
          {empleado && (
            <div style={{ marginTop: 8, padding: 12, background: 'var(--color-success-subtle-bg)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-success-subtle-text)' }}>{empleado.nombreCompleto}</p>
              <p style={{ margin: 0, color: 'var(--color-success-subtle-text)' }}>{empleado.area} — {empleado.cargo}</p>
            </div>
          )}
          {errors.empleado_id && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>{errors.empleado_id.message}</p>}
          <input type="hidden" {...register('empleado_id')} />
        </div>

        <div className="cx-field">
          <label className="cx-label">Tipo de solicitud</label>
          <Controller
            control={control}
            name="tipoSolicitud"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                placeholder="Seleccionar..."
                options={[
                  { value: '', label: 'Seleccionar...' },
                  ...Object.entries(TIPOS_SOLICITUD_LABEL).map(([v, l]) => ({ value: v, label: l })),
                ]}
              />
            )}
          />
          {errors.tipoSolicitud && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>{errors.tipoSolicitud.message}</p>}
        </div>

        <div className="cx-field">
          <label className="cx-label">Prioridad</label>
          <Controller
            control={control}
            name="prioridad"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={Object.entries(PRIORIDADES_LABEL).map(([v, l]) => ({ value: v, label: l }))}
              />
            )}
          />
        </div>

        <div className="cx-field">
          <label className="cx-label">Descripción del problema</label>
          <textarea
            {...register('descripcion')}
            rows={4}
            placeholder="Describe el problema con el mayor detalle posible..."
            className="cx-input"
            style={{ resize: 'none' }}
          />
          {errors.descripcion && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>{errors.descripcion.message}</p>}
        </div>

        <div className="cx-field">
          <label className="cx-label">Archivos adjuntos <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
          <FileUploadZone files={archivos} onChange={setArchivos} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>Crear Solicitud</Button>
        </div>
      </form>
    </Modal>
  );
}
