import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TicketMark } from '../components/common/CenthrixIcons';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

const BULLETS = [
  'Numeración automática de tickets',
  'Cumplimiento de SLA en tiempo real',
  'Trazabilidad completa ISO 9001',
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email, password }) => {
    try {
      const user = await login(email, password);
      toast.success(`Bienvenido, ${user.nombre}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', display: 'flex' }}>
      <div className="sist-login-panel" style={{ flex: 1, minWidth: 320, position: 'relative', overflow: 'hidden', background: 'var(--color-accent)', display: 'none', flexDirection: 'column', justifyContent: 'center', padding: 60, color: 'white' }}>
        <div style={{ position: 'absolute', top: -120, right: -100, width: 420, height: 420, borderRadius: '50%', background: 'rgba(255,255,255,.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -160, left: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
            <TicketMark size={26} />
          </div>
          <h1 style={{ fontSize: 32, margin: '0 0 12px', lineHeight: 1.15 }}>Soporte TI para el equipo ISTHO</h1>
          <p style={{ margin: '0 0 32px', fontSize: 14.5, opacity: .85, textWrap: 'pretty' }}>Reporta incidentes, da seguimiento a tus tickets y consulta el estado de tus solicitudes en un solo lugar.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {BULLETS.map((b) => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                  <Check size={13} strokeWidth={2.5} />
                </span>
                <span style={{ fontSize: 13.5 }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20 }}
          >
            <ArrowLeft size={15} />
            Volver al inicio
          </button>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, margin: '0 0 4px' }}>Iniciar sesión</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Ingresa con tu cuenta de ISTHO S.A.S.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="cx-card cx-elev-md" style={{ padding: '28px 24px' }}>
            <div className="cx-field" style={{ marginBottom: 14 }}>
              <label className="cx-label">Correo electrónico</label>
              <input
                className="cx-input"
                type="email"
                autoComplete="email"
                placeholder="usuario@istho.com.co"
                style={errors.email ? { borderColor: 'var(--color-danger)' } : undefined}
                {...register('email')}
              />
              {errors.email && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>{errors.email.message}</p>}
            </div>

            <div className="cx-field" style={{ marginBottom: 14 }}>
              <label className="cx-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="cx-input"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: 36, ...(errors.password ? { borderColor: 'var(--color-danger)' } : {}) }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label="Mostrar contraseña"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>{errors.password.message}</p>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Recordarme
              </label>
              <a style={{ fontSize: 12.5, color: 'var(--color-accent)', cursor: 'pointer', textDecoration: 'none' }}>¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" disabled={isSubmitting} className="cx-btn cx-btn-primary cx-btn-block">
              <LogIn size={15} />
              Ingresar
            </button>
          </form>
          <p className="text-muted" style={{ textAlign: 'center', fontSize: 11.5, margin: '18px 0 0' }}>Sistema Integral de Solicitudes para Soporte Tecnológico v1.0</p>
        </div>
      </div>
    </div>
  );
}
