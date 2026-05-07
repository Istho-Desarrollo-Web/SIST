import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, ToggleLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { empleadoService } from '../services/empleadoService';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { SkeletonTable } from '../components/common/Skeleton';
import { Badge } from '../components/common/Badge';
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Identificación" error={errors.identificacion?.message} {...register('identificacion')} disabled={isEdit} />
          <Input label="Nombre completo" error={errors.nombreCompleto?.message} {...register('nombreCompleto')} />
          <Input label="Área" error={errors.area?.message} {...register('area')} />
          <Input label="Cargo" error={errors.cargo?.message} {...register('cargo')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Teléfono" error={errors.telefono?.message} {...register('telefono')} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-500 dark:text-white">Empleados</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Registro de empleados ISTHO</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setImportarOpen(true)} className="flex-1 sm:flex-none justify-center">
            <Upload size={16} />
            <span className="sm:hidden">Importar</span>
            <span className="hidden sm:inline">Importar Excel</span>
          </Button>
          <Button onClick={() => setModal('create')} className="flex-1 sm:flex-none justify-center">
            <Plus size={16} />
            <span className="sm:hidden">Nuevo</span>
            <span className="hidden sm:inline">Nuevo Empleado</span>
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, identificación o área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={5} cols={4} /></div>
        ) : empleados.length === 0 ? (
          <p className="py-10 text-center text-slate-400 text-sm">No hay empleados</p>
        ) : (
          <>
            {/* Tarjetas móvil */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-navy-600">
              {empleados.map(e => (
                <div key={e.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-navy-500 dark:text-white truncate">{e.nombreCompleto}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{e.identificacion}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {e.area}{e.cargo ? ` — ${e.cargo}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className={e.activo ? 'bg-cgreen-100 text-cgreen-800 dark:bg-cgreen-900/30 dark:text-cgreen-300' : 'bg-slate-100 text-slate-600'}>
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <div className="flex gap-1">
                        <button onClick={() => setModal(e)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-navy-600 text-slate-500 hover:text-orange-500 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setConfirmId(e.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors">
                          <ToggleLeft size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla escritorio */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-navy-800">
                  <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    <th className="text-left px-4 py-3">Identificación</th>
                    <th className="text-left px-4 py-3">Nombre</th>
                    <th className="text-left px-4 py-3">Área</th>
                    <th className="text-left px-4 py-3">Cargo</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-600">
                  {empleados.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-navy-700/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{e.identificacion}</td>
                      <td className="px-4 py-3 font-medium text-navy-500 dark:text-white">{e.nombreCompleto}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.area}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{e.cargo || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge className={e.activo ? 'bg-cgreen-100 text-cgreen-800 dark:bg-cgreen-900/30 dark:text-cgreen-300' : 'bg-slate-100 text-slate-600'}>
                          {e.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setModal(e)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-navy-600 text-slate-500 hover:text-orange-500 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setConfirmId(e.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors">
                            <ToggleLeft size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="px-4 pb-4">
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={cargar} />
        </div>
      </Card>

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
