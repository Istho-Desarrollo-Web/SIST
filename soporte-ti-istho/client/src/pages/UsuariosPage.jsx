import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usuarioService } from '../services/usuarioService';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { SkeletonTable } from '../components/common/Skeleton';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

const schemaBase = z.object({
  identificacion: z.string().min(1, 'Requerido'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  rol: z.enum(['admin', 'tecnico', 'usuario']),
  area: z.string().optional(),
  especialidad: z.string().optional(),
});

const schemaCreate = schemaBase.extend({ password: z.string().min(8, 'Mínimo 8 caracteres') });
const schemaEdit = schemaBase.extend({ password: z.string().min(8).optional().or(z.literal('')) });

const ROLES_LABEL = { admin: 'Administrador', tecnico: 'Técnico', usuario: 'Usuario' };
const ROLES_COLOR = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  tecnico: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  usuario: 'bg-slate-100 text-slate-700 dark:bg-navy-700 dark:text-slate-300',
};

function UsuarioForm({ usuario, onClose, onSaved }) {
  const isEdit = !!usuario;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(isEdit ? schemaEdit : schemaCreate),
    defaultValues: usuario ? { ...usuario, password: '' } : { rol: 'usuario' },
  });

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      if (isEdit) {
        await usuarioService.actualizar(usuario.id, payload);
        toast.success('Usuario actualizado');
      } else {
        await usuarioService.crear(payload);
        toast.success('Usuario creado');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Identificación" error={errors.identificacion?.message} {...register('identificacion')} disabled={isEdit} />
          <Input label="Nombre completo" error={errors.nombre?.message} {...register('nombre')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rol</label>
            <select
              {...register('rol')}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              {Object.entries(ROLES_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <Input label="Área" error={errors.area?.message} {...register('area')} />
          <Input label="Especialidad" error={errors.especialidad?.message} {...register('especialidad')} />
          <div className="sm:col-span-2">
            <Input
              label={isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              type="password"
              error={errors.password?.message}
              placeholder={isEdit ? 'Dejar vacío para no cambiar' : ''}
              {...register('password')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const cargar = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await usuarioService.listar({ page, limit: 10 });
      setUsuarios(res.data.data);
      setPagination({ page: res.data.pagination.page, totalPages: res.data.pagination.totalPages });
    } catch { toast.error('Error cargando usuarios'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(1); }, [cargar]);

  const desactivar = async () => {
    try {
      await usuarioService.desactivar(confirmId);
      toast.success('Usuario desactivado');
      cargar(pagination.page);
    } catch (err) { toast.error(err.response?.data?.message || 'Error al desactivar'); }
    finally { setConfirmId(null); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-500 dark:text-white">Usuarios del Sistema</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Solo administradores pueden gestionar usuarios</p>
        </div>
        <Button onClick={() => setModal('create')} className="w-full sm:w-auto justify-center">
          <Plus size={16} />Nuevo Usuario
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={4} cols={4} /></div>
        ) : usuarios.length === 0 ? (
          <p className="py-10 text-center text-slate-400 text-sm">No hay usuarios</p>
        ) : (
          <>
            {/* Tarjetas móvil */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-navy-600">
              {usuarios.map(u => (
                <div key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-navy-500 dark:text-white truncate">{u.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{u.email}</p>
                      <p className="text-xs text-slate-400 mt-1">{u.area || '-'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className={ROLES_COLOR[u.rol]}>{ROLES_LABEL[u.rol]}</Badge>
                      <Badge className={u.activo ? 'bg-cgreen-100 text-cgreen-800 dark:bg-cgreen-900/30 dark:text-cgreen-300' : 'bg-slate-100 text-slate-600'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <div className="flex gap-1">
                        <button onClick={() => setModal(u)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-navy-600 text-slate-500 hover:text-orange-500 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setConfirmId(u.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors">
                          <UserX size={14} />
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
                    <th className="text-left px-4 py-3">Nombre</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Rol</th>
                    <th className="text-left px-4 py-3">Área</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-600">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-navy-700/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-navy-500 dark:text-white">{u.nombre}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-4 py-3"><Badge className={ROLES_COLOR[u.rol]}>{ROLES_LABEL[u.rol]}</Badge></td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.area || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge className={u.activo ? 'bg-cgreen-100 text-cgreen-800 dark:bg-cgreen-900/30 dark:text-cgreen-300' : 'bg-slate-100 text-slate-600'}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setModal(u)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-navy-600 text-slate-500 hover:text-orange-500 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setConfirmId(u.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors">
                            <UserX size={14} />
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
        <UsuarioForm
          usuario={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar(pagination.page); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Desactivar usuario"
        message="El usuario perderá acceso al sistema de inmediato. Esta acción se puede revertir desde la base de datos."
        confirmLabel="Desactivar"
        onConfirm={desactivar}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
