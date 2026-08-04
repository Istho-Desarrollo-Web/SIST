import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, UserX, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usuarioService } from '../services/usuarioService';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
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
const ROLES_TAG = { admin: 'cx-tag-accent', tecnico: 'cx-tag-info', usuario: 'cx-tag-neutral' };

function iniciales(nombre) {
  return (nombre || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function UsuarioForm({ usuario, onClose, onSaved }) {
  const isEdit = !!usuario;
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
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
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <Input label="Identificación" error={errors.identificacion?.message} {...register('identificacion')} disabled={isEdit} />
          <Input label="Nombre completo" error={errors.nombre?.message} {...register('nombre')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Área" error={errors.area?.message} {...register('area')} />
          <Input label="Especialidad" error={errors.especialidad?.message} {...register('especialidad')} />
          <Input
            label={isEdit ? 'Contraseña (opcional)' : 'Contraseña'}
            type="password"
            error={errors.password?.message}
            placeholder={isEdit ? 'Dejar vacío para no cambiar' : ''}
            {...register('password')}
          />
        </div>
        <div>
          <p className="cx-label" style={{ margin: '0 0 8px' }}>Rol</p>
          <Controller
            name="rol"
            control={control}
            render={({ field }) => (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(ROLES_LABEL).map(([v, l]) => (
                  <button key={v} type="button" className={`cx-btn ${field.value === v ? 'cx-btn-primary' : 'cx-btn-secondary'}`} style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => field.onChange(v)}>{l}</button>
                ))}
              </div>
            )}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <UserCog size={21} />
          </span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 23, margin: '0 0 2px', letterSpacing: '-0.01em' }}>Usuarios del Sistema</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Solo administradores pueden gestionar usuarios</p>
          </div>
        </div>
        <button type="button" className="cx-btn cx-btn-primary" onClick={() => setModal('create')}>
          <Plus size={14} />
          Nuevo Usuario
        </button>
      </div>

      <div className="cx-card cx-elev-sm" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <table className="cx-table">
              <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Área</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {[0, 1, 2, 3].map(i => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="cx-skeleton" style={{ height: 12, width: '70%' }} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="cx-empty" style={{ border: 'none', padding: '44px 24px' }}>
            <div className="cx-empty-icon"><UserCog size={24} /></div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '6px 0 0' }}>No hay usuarios</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cx-table" style={{ minWidth: 600 }}>
              <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Área</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>{iniciales(u.nombre)}</span>
                        {u.nombre}
                      </div>
                    </td>
                    <td className="text-muted">{u.email}</td>
                    <td><span className={`cx-tag ${ROLES_TAG[u.rol]}`}>{ROLES_LABEL[u.rol]}</span></td>
                    <td className="text-muted">{u.area || '-'}</td>
                    <td><span className={`cx-tag ${u.activo ? 'cx-tag-success' : 'cx-tag-neutral'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => setModal(u)}><Edit2 size={14} /></button>
                      <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" onClick={() => setConfirmId(u.id)}><UserX size={14} /></button>
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
