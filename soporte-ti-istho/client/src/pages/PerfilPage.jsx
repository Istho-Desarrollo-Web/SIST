import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

const schema = z.object({
  passwordActual: z.string().min(1, 'La contraseña actual es requerida'),
  passwordNuevo: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar: z.string(),
}).refine(d => d.passwordNuevo === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
});

const ROLES_LABEL = { admin: 'Administrador', tecnico: 'Técnico', usuario: 'Usuario' };

export function PerfilPage() {
  const { user } = useAuth();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ passwordActual, passwordNuevo }) => {
    try {
      await authService.cambiarPassword({ passwordActual, passwordNuevo });
      toast.success('Contraseña actualizada correctamente');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña');
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <UserCircle2 size={21} />
        </span>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 23, margin: '0 0 2px', letterSpacing: '-0.01em' }}>Mi Perfil</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Gestiona tu información y seguridad</p>
        </div>
      </div>

      <div className="cx-card cx-elev-sm" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <span style={{ width: 60, height: 60, borderRadius: 'var(--radius-lg)', background: 'var(--color-accent)', color: 'white', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, flex: 'none' }}>
            {user?.nombre?.[0]?.toUpperCase()}
          </span>
          <div>
            <h2 style={{ fontSize: 18, margin: '0 0 2px' }}>{user?.nombre}</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{ROLES_LABEL[user?.rol] || user?.rol}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, fontSize: 13 }}>
          <div>
            <p className="cx-label" style={{ margin: '0 0 3px' }}>Email</p>
            <p style={{ margin: 0 }}>{user?.email}</p>
          </div>
          <div>
            <p className="cx-label" style={{ margin: '0 0 3px' }}>Área</p>
            <p style={{ margin: 0 }}>{user?.area || '-'}</p>
          </div>
          {user?.especialidad && (
            <div>
              <p className="cx-label" style={{ margin: '0 0 3px' }}>Especialidad</p>
              <p style={{ margin: 0 }}>{user.especialidad}</p>
            </div>
          )}
        </div>
      </div>

      <div className="cx-card cx-elev-sm" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 14.5, margin: '0 0 16px' }}>Cambiar contraseña</h3>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Contraseña actual" type="password" error={errors.passwordActual?.message} {...register('passwordActual')} />
          <Input label="Nueva contraseña" type="password" error={errors.passwordNuevo?.message} {...register('passwordNuevo')} />
          <Input label="Confirmar nueva contraseña" type="password" error={errors.confirmar?.message} {...register('confirmar')} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={isSubmitting}>Actualizar contraseña</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
