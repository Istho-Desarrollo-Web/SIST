import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, ToggleLeft, Upload, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { empleadoService } from '../services/empleadoService';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ImportarEmpleadosModal } from '../components/empleados/ImportarEmpleadosModal';

const schema = z.object({
  identificacion: z.string().min(1, 'Requerido'),
  nombreCompleto: z.string().min(2, 'Mínimo 2 caracteres'),
  area: z.string().min(1, 'Requerido'),
  cargo: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
});

function iniciales(nombre) {
  return (nombre || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function EmpleadoForm({ empleado, onClose, onSaved }) {
  const isEdit = !!empleado;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: empleado || {},
  });

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await empleadoService.actualizar(empleado.id, data);
        toast.success('Empleado actualizado');
      } else {
        await empleadoService.crear(data);
        toast.success('Empleado creado');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <Input label="Identificación" error={errors.identificacion?.message} {...register('identificacion')} disabled={isEdit} />
          <Input label="Nombre completo" error={errors.nombreCompleto?.message} {...register('nombreCompleto')} />
          <Input label="Área" error={errors.area?.message} {...register('area')} />
          <Input label="Cargo" error={errors.cargo?.message} {...register('cargo')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Teléfono" error={errors.telefono?.message} {...register('telefono')} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function EmpleadosPage() {
  const [empleados, setEmpleados] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const hayBusquedaActiva = !!search;
  const limpiarBusqueda = () => setSearch('');
  const [modal, setModal] = useState(null);
  const [importarOpen, setImportarOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const cargar = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await empleadoService.listar({ page, limit: 10, search, activo: true });
      setEmpleados(res.data.data);
      setPagination({ page: res.data.pagination.page, totalPages: res.data.pagination.totalPages });
    } catch { toast.error('Error cargando empleados'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { cargar(1); }, [cargar]);

  const desactivar = async () => {
    try {
      await empleadoService.desactivar(confirmId);
      toast.success('Empleado desactivado');
      cargar(pagination.page);
    } catch { toast.error('Error al desactivar'); }
    finally { setConfirmId(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Users size={21} />
          </span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 23, margin: '0 0 2px', letterSpacing: '-0.01em' }}>Empleados</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Registro de empleados ISTHO</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="cx-btn cx-btn-secondary" onClick={() => setImportarOpen(true)}>
            <Upload size={14} />
            Importar Excel
          </button>
          <button type="button" className="cx-btn cx-btn-primary" onClick={() => setModal('create')}>
            <Plus size={14} />
            Nuevo Empleado
          </button>
        </div>
      </div>

      <div className="cx-card cx-elev-sm" style={{ padding: 16, marginBottom: 16 }}>
        <input
          className="cx-input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          placeholder="Buscar por nombre, identificación o área..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="cx-card cx-elev-sm" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <table className="cx-table">
              <thead><tr><th>Identificación</th><th>Nombre</th><th>Área</th><th>Cargo</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {[0, 1, 2, 3, 4].map(i => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="cx-skeleton" style={{ height: 12, width: '70%' }} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : empleados.length === 0 ? (
          <div className="cx-empty" style={{ border: 'none', padding: '44px 24px' }}>
            <div className="cx-empty-icon"><Users size={24} /></div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '6px 0 0' }}>
              {hayBusquedaActiva ? 'Sin coincidencias' : 'No hay empleados'}
            </p>
            {hayBusquedaActiva && (
              <button type="button" className="cx-btn cx-btn-ghost" style={{ marginTop: 10 }} onClick={limpiarBusqueda}>
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cx-table" style={{ minWidth: 600 }}>
              <thead><tr><th>Identificación</th><th>Nombre</th><th>Área</th><th>Cargo</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {empleados.map(e => (
                  <tr key={e.id}>
                    <td className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{e.identificacion}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>{iniciales(e.nombreCompleto)}</span>
                        {e.nombreCompleto}
                      </div>
                    </td>
                    <td className="text-muted">{e.area}</td>
                    <td className="text-muted">{e.cargo || '-'}</td>
                    <td><span className={`cx-tag ${e.activo ? 'cx-tag-success' : 'cx-tag-neutral'}`}>{e.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => setModal(e)}><Edit2 size={14} /></button>
                      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => setConfirmId(e.id)}><ToggleLeft size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 16 }}>
          <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" disabled={pagination.page <= 1} onClick={() => cargar(pagination.page - 1)}>‹</button>
          <span className="text-muted" style={{ fontSize: 12 }}>Página {pagination.page} de {pagination.totalPages}</span>
          <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" disabled={pagination.page >= pagination.totalPages} onClick={() => cargar(pagination.page + 1)}>›</button>
        </div>
      </div>

      {modal && (
        <EmpleadoForm
          empleado={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar(pagination.page); }}
        />
      )}

      <ImportarEmpleadosModal
        open={importarOpen}
        onClose={() => setImportarOpen(false)}
        onImportado={() => cargar(1)}
      />

      <ConfirmDialog
        open={!!confirmId}
        title="Desactivar empleado"
        message="El empleado no podrá registrar nuevas solicitudes. Esta acción se puede revertir desde la base de datos."
        confirmLabel="Desactivar"
        onConfirm={desactivar}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
