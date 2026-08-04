import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Upload, FileText, X, Send, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { TIPOS_SOLICITUD_LABEL, PRIORIDADES_LABEL } from '../utils/constants';
import { TicketMark } from '../components/common/CenthrixIcons';

const MAX_ARCHIVOS = 5;
const DESCRIPCION_MAX = 1000;

const schema = z.object({
  tipoSolicitud: z.string().min(1, 'Selecciona el tipo de solicitud'),
  prioridad: z.enum(['critica', 'alta', 'media', 'baja']),
  descripcion: z.string()
    .min(10, 'Describe el problema con al menos 10 caracteres')
    .max(DESCRIPCION_MAX, `Máximo ${DESCRIPCION_MAX} caracteres`),
});

export function SolicitudPublicaPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [identificacion, setIdentificacion] = useState('');
  const [empleado, setEmpleado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [resultado, setResultado] = useState(null);
  const [archivos, setArchivos] = useState([]);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { prioridad: 'media' },
  });

  const buscarEmpleado = async () => {
    const id = identificacion.trim();
    if (!id) return;
    if (!/^\d+$/.test(id)) { setErrorBusqueda('La identificación solo debe contener números.'); return; }
    if (id.length < 5) { setErrorBusqueda('La identificación debe tener al menos 5 dígitos.'); return; }
    if (id.length > 20) { setErrorBusqueda('La identificación no puede superar 20 dígitos.'); return; }

    setBuscando(true);
    setErrorBusqueda('');
    try {
      const res = await api.get('/empleados/buscar', { params: { identificacion: id } });
      setEmpleado(res.data.data);
    } catch {
      setErrorBusqueda('No encontrado en el sistema. Verifica el número de identificación.');
    } finally {
      setBuscando(false);
    }
  };

  const cambiarIdentificacion = () => {
    setEmpleado(null);
    setIdentificacion('');
    setErrorBusqueda('');
    reset();
    setArchivos([]);
  };

  const onArchivosChange = (e) => {
    const nuevos = Array.from(e.target.files || []);
    setArchivos(s => [...s, ...nuevos].slice(0, MAX_ARCHIVOS));
    e.target.value = '';
  };
  const removeArchivo = (idx) => setArchivos(s => s.filter((_, i) => i !== idx));

  const onSubmit = async (data) => {
    try {
      const form = new FormData();
      form.append('identificacion', identificacion.trim());
      form.append('tipoSolicitud', data.tipoSolicitud);
      form.append('prioridad', data.prioridad);
      form.append('descripcion', data.descripcion);
      archivos.forEach(f => form.append('archivos', f));

      const res = await api.post('/solicitudes/publica', form);
      setResultado(res.data.data);
    } catch (err) {
      setErrorBusqueda(err.response?.data?.message || 'Error al enviar la solicitud. Inténtalo de nuevo.');
    }
  };

  const initials = (empleado?.nombreCompleto || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div style={{ height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', padding: '24px 16px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16, flex: 'none' }}
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </button>

        {!resultado ? (
          <div className="cx-card cx-elev-md" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0, overflow: 'hidden' }}>
            <div className="cx-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <p className="text-muted" style={{ margin: '0 0 3px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Código SIST-FT-01 · Versión 01</p>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 21, margin: 0 }}>Solicitud de Soporte Técnico</h1>
                </div>
                <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--color-accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                  <TicketMark size={21} />
                </span>
              </div>

              <h6 className="text-muted" style={{ margin: '0 0 12px', textTransform: 'uppercase', fontSize: 11, letterSpacing: '.05em' }}>1. Datos del solicitante</h6>

              {!empleado ? (
                <div className="cx-field" style={{ marginBottom: 14 }}>
                  <label className="cx-label">Número de identificación</label>
                  <input
                    className="cx-input"
                    value={identificacion}
                    onChange={e => { setIdentificacion(e.target.value.replace(/\D/g, '')); setErrorBusqueda(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarEmpleado(); } }}
                    placeholder="Escribe tu número de identificación y presiona Enter"
                    disabled={buscando}
                  />
                  {buscando && <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>Buscando…</p>}
                  {!buscando && errorBusqueda && <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>{errorBusqueda}</p>}
                </div>
              ) : (
                <div className="cx-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 16, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700, flex: 'none' }}>{initials}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14.5 }}>{empleado.nombreCompleto}</p>
                    <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{empleado.area}{empleado.cargo ? ` — ${empleado.cargo}` : ''}</p>
                  </div>
                  <button type="button" className="cx-btn cx-btn-ghost" style={{ fontSize: 12, flex: 'none' }} onClick={cambiarIdentificacion}>Cambiar</button>
                </div>
              )}

              {empleado && (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <h6 className="text-muted" style={{ margin: '0 0 12px', textTransform: 'uppercase', fontSize: 11, letterSpacing: '.05em' }}>2. Detalle de la solicitud</h6>

                  <p className="cx-label" style={{ margin: '0 0 8px' }}>Tipo de solicitud</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {Object.entries(TIPOS_SOLICITUD_LABEL).map(([v, l]) => (
                      <Controller
                        key={v}
                        control={control}
                        name="tipoSolicitud"
                        render={({ field }) => (
                          <button type="button" className={`cx-btn ${field.value === v ? 'cx-btn-primary' : 'cx-btn-secondary'}`} style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => field.onChange(v)}>{l}</button>
                        )}
                      />
                    ))}
                  </div>
                  {errors.tipoSolicitud && <p style={{ margin: '-10px 0 14px', fontSize: 12, color: 'var(--color-danger)' }}>{errors.tipoSolicitud.message}</p>}

                  <p className="cx-label" style={{ margin: '0 0 8px' }}>Prioridad</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {Object.entries(PRIORIDADES_LABEL).map(([v, l]) => (
                      <Controller
                        key={v}
                        control={control}
                        name="prioridad"
                        render={({ field }) => (
                          <button type="button" className={`cx-btn ${field.value === v ? 'cx-btn-primary' : 'cx-btn-secondary'}`} style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => field.onChange(v)}>{l}</button>
                        )}
                      />
                    ))}
                  </div>

                  <div className="cx-field" style={{ marginBottom: 20 }}>
                    <label className="cx-label">Descripción del problema</label>
                    <textarea
                      className="cx-input"
                      rows={4}
                      style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                      placeholder="Cuenta qué ocurrió, cuándo empezó y qué equipo o sistema está afectado..."
                      {...register('descripcion')}
                    />
                    {errors.descripcion && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>{errors.descripcion.message}</p>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <label className="cx-label" style={{ margin: 0 }}>Adjuntar documentos o fotos</label>
                    {archivos.length > 0 && <span className="cx-tag cx-tag-accent">{archivos.length}/{MAX_ARCHIVOS} archivos</span>}
                  </div>
                  {archivos.length < MAX_ARCHIVOS ? (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)', padding: 22, cursor: 'pointer', textAlign: 'center' }}>
                      <Upload size={22} color="var(--color-text-muted)" />
                      <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>Haz clic para elegir archivos (imágenes o PDF) — máximo {MAX_ARCHIVOS}</span>
                      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" onChange={onArchivosChange} style={{ display: 'none' }} />
                    </label>
                  ) : (
                    <p className="text-muted" style={{ margin: 0, fontSize: 12, textAlign: 'center', padding: 12, border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>Alcanzaste el máximo de {MAX_ARCHIVOS} archivos</p>
                  )}
                  {archivos.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                      {archivos.map((af, i) => (
                        <div key={`${af.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', padding: '7px 10px' }}>
                          <FileText size={14} color="var(--color-text-muted)" style={{ flex: 'none' }} />
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{af.name}</span>
                          <button type="button" onClick={() => removeArchivo(i)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2, display: 'flex', flex: 'none' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </form>
              )}
            </div>

            <div style={{ padding: '16px 26px', background: 'var(--color-card)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flex: 'none' }}>
              <button type="button" className="cx-btn cx-btn-ghost" onClick={() => navigate('/')}>Cancelar</button>
              <button type="button" className="cx-btn cx-btn-primary" disabled={!empleado || isSubmitting} onClick={handleSubmit(onSubmit)}>
                <Send size={14} />
                Enviar solicitud
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="cx-card cx-elev-md" style={{ padding: '44px 30px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-success-subtle-bg)', color: 'var(--color-success-subtle-text)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
                <CheckCircle size={26} />
              </div>
              <h2 style={{ fontSize: 19, margin: '0 0 6px' }}>Solicitud enviada</h2>
              <p className="text-muted" style={{ margin: '0 0 4px', fontSize: 13.5 }}>Tu ticket fue registrado con el número</p>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700, fontSize: 16, margin: '0 0 22px' }}>{resultado.numero}</p>
              <p className="text-muted" style={{ margin: '0 0 24px', fontSize: 13, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', textWrap: 'pretty' }}>Un técnico de soporte revisará tu caso y te contactará según la prioridad asignada.</p>
              <button type="button" className="cx-btn cx-btn-primary" onClick={() => navigate('/')}>Volver al inicio</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
