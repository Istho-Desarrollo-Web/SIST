import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

const schema = z.object({
  passwordActual: z.string().min(1, 'Requerido'),
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy-500 dark:text-white">Mi Perfil</h1>

      {/* Info */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{user?.nombre?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-navy-500 dark:text-white">{user?.nombre}</h2>
            <p className="text-slate-500 dark:text-slate-400">{ROLES_LABEL[user?.rol]}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
            <p className="text-navy-500 dark:text-white mt-0.5">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Área</p>
            <p className="text-navy-500 dark:text-white mt-0.5">{user?.area || '-'}</p>
          </div>
          {user?.especialidad && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Especialidad</p>
              <p className="text-navy-500 dark:text-white mt-0.5">{user.especialidad}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Cambiar contraseña */}
      <Card className="p-6">
        <h3 className="font-semibold text-navy-500 dark:text-white mb-4">Cambiar contraseña</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Contraseña actual" type="password" error={errors.passwordActual?.message} {...register('passwordActual')} />
          <Input label="Nueva contraseña" type="password" error={errors.passwordNuevo?.message} {...register('passwordNuevo')} />
          <Input label="Confirmar nueva contraseña" type="password" error={errors.confirmar?.message} {...register('confirmar')} />
          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>Actualizar contraseña</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
