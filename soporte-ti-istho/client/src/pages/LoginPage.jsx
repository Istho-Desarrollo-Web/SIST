import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { LogoIcon } from '../components/common/LogoSIST';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email, password }) => {
    try {
      const user = await login(email, password);
      toast.success(`Bienvenido, ${user.nombre}`);
      navigate(user.rol === 'usuario' ? '/solicitudes' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-700 to-navy-500 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-2xl mb-4 shadow-xl shadow-orange-900/40">
            <LogoIcon size={44} />
          </div>
          <h1 className="text-2xl font-bold text-white">Soporte TI</h1>
          <p className="text-navy-200 text-sm mt-1">ISTHO S.A.S. — Centro Logístico Industrial del Norte</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-navy-700 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-navy-500 dark:text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="usuario@istho.com.co"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 pr-10 rounded-lg border text-sm transition-colors
                    bg-white dark:bg-navy-800 text-slate-900 dark:text-white
                    border-slate-300 dark:border-navy-500
                    focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                    ${errors.password ? 'border-red-500' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full justify-center mt-2">
              <LogIn size={16} />
              Ingresar
            </Button>
          </form>
        </div>

        <p className="text-center text-navy-300 text-xs mt-6">
          Sistema Integral de Solicitudes para Soporte Tecnológico v1.0
        </p>
      </div>
    </div>
  );
}
