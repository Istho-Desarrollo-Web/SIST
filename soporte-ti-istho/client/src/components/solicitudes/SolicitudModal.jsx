import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, RefreshCw, Star } from 'lucide-react';
import { solicitudService } from '../../services/solicitudService';
import { formulariosApi } from '../../services/formulariosApi';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { ArchivoViewer } from './ArchivoViewer';
import { formatFecha, formatMinutos } from '../../utils/formatters';
import { ESTADOS_LABEL, TIPOS_SOLICITUD_LABEL, ESTADO_COLORS, PRIORIDADES_LABEL, PRIORIDAD_COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

export function SolicitudModal({ solicitud: init, tecnicos, onClose, onUpdate }) {
  const { user } = useAuth();
  const [sol, setSol] = useState(init);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMotivoRechazo, setShowMotivoRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [calificacion, setCalificacion] = useState(init.calificacion || 0);
  const [hoverCalif, setHoverCalif] = useState(0);
  const [comentarioCalif, setComentarioCalif] = useState(init.comentarioCalificacion || '');
  const [savingCalif, setSavingCalif] = useState(false);
  const [showAsociar, setShowAsociar] = useState(false);
  const [respuestas, setRespuestas] = useState([]);
  const [loadingRespuestas, setLoadingRespuestas] = useState(false);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState('');

  const puedeGestionar = user.rol === 'admin' || user.rol === 'tecnico';
  const canAsociar = ['admin', 'tecnico'].includes(user?.rol);

  const abrirAsociar = async () => {
    setShowAsociar(true);
    setLoadingRespuestas(true);
    try {
      const res = await formulariosApi.listarPdfs();
      setRespuestas(res.data.data);
    } catch {
      toast.error('Error al cargar formularios');
    } finally {
      setLoadingRespuestas(false);
    }
  };

  const confirmarAsociar = async () => {
    if (!respuestaSeleccionada) return;
    try {
      await formulariosApi.asociarSolicitud(respuestaSeleccionada, sol.id);
      toast.success('Formulario asociado');
      setShowAsociar(false);
      if (onUpdate) onUpdate();
    } catch {
      toast.error('Error al asociar formulario');
    }
  };

  const cambiarEstado = async (estado, motivo) => {
    setSaving(true);
    try {
      const res = await solicitudService.cambiarEstado(sol.id, estado, motivo);
      setSol(res.data.data);
      toast.success('Estado actualizado');
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al cambiar estado';
      toast.error(msg);
      return false;
    } finally { setSaving(false); }
  };

  const handleEstadoClick = (estado) => {
    if (estado === 'rechazado') {
      setMotivoRechazo('');
      setShowMotivoRechazo(true);
    } else {
      cambiarEstado(estado);
    }
  };

  const confirmarRechazo = async () => {
    if (!motivoRechazo.trim()) return;
    const ok = await cambiarEstado('rechazado', motivoRechazo.trim());
    if (ok) {
      setShowMotivoRechazo(false);
      setMotivoRechazo('');
    }
  };

  const asignar = async (tecnicoId) => {
    setSaving(true);
    try {
      const res = await solicitudService.asignarTecnico(sol.id, parseInt(tecnicoId));
      setSol(res.data.data);
      toast.success('Técnico asignado');
    } catch { toast.error('Error al asignar técnico'); }
    finally { setSaving(false); }
  };

  const enviarComentario = async () => {
    if (!comentario.trim()) return;
    setSaving(true);
    try {
      const res = await solicitudService.agregarComentario(sol.id, comentario.trim());
      setSol(res.data.data);
      setComentario('');
      toast.success('Comentario agregado');
    } catch { toast.error('Error al agregar comentario'); }
    finally { setSaving(false); }
  };

  const enviarCalificacion = async () => {
    if (!calificacion) return;
    setSavingCalif(true);
    try {
      const res = await solicitudService.calificar(sol.id, { calificacion, comentarioCalificacion: comentarioCalif });
      setSol(res.data.data);
      toast.success('Calificación registrada');
    } catch { toast.error('Error al calificar'); }
    finally { setSavingCalif(false); }
  };

  const estadosSiguientes = {
    abierto:           ['en_analisis'],
    en_analisis:       ['en_proceso', 'pendiente_usuario', 'pendiente_externo', 'rechazado'],
    en_proceso:        ['resuelto', 'pendiente_usuario', 'pendiente_externo'],
    pendiente_usuario: ['en_proceso', 'cerrado'],
    pendiente_externo: ['en_proceso'],
    resuelto:          ['cerrado', 'en_proceso'],
    cerrado:           [],
    rechazado:         [],
  };

  const sectionLabel = { margin: '0 0 8px' };

  return (
    <Modal open onClose={onClose} title={`Solicitud ${sol.numero}`} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className={`cx-tag ${ESTADO_COLORS[sol.estado]}`}>{ESTADOS_LABEL[sol.estado]}</span>
          <span className={`cx-tag ${PRIORIDAD_COLORS[sol.prioridad]}`}>{PRIORIDADES_LABEL[sol.prioridad]}</span>
          <span className="text-muted" style={{ fontSize: 12 }}>{TIPOS_SOLICITUD_LABEL[sol.tipoSolicitud]}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, fontSize: 13 }}>
          <div>
            <p className="cx-label" style={sectionLabel}>Empleado</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{sol.empleado?.nombreCompleto}</p>
            <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{sol.empleado?.area}</p>
          </div>
          <div>
            <p className="cx-label" style={sectionLabel}>Técnico asignado</p>
            {puedeGestionar ? (
              <Select
                value={sol.tecnicoAsignado || ''}
                onChange={val => asignar(val)}
                placeholder="Sin asignar"
                options={[
                  { value: '', label: 'Sin asignar' },
                  ...tecnicos.map(t => ({ value: t.id, label: t.nombre })),
                ]}
              />
            ) : (
              <p style={{ margin: 0, fontWeight: 600 }}>{sol.tecnico?.nombre || 'Sin asignar'}</p>
            )}
          </div>
          <div>
            <p className="cx-label" style={sectionLabel}>Creado</p>
            <p style={{ margin: 0 }}>{formatFecha(sol.fechaCreacion)}</p>
          </div>
          <div>
            <p className="cx-label" style={sectionLabel}>Límite resolución</p>
            <p style={{ margin: 0 }}>{formatFecha(sol.fechaLimiteResolucion)}</p>
          </div>
          <div>
            <p className="cx-label" style={sectionLabel}>SLA consumido</p>
            <p style={{ margin: 0, fontWeight: 700, color: sol.porcentajeSLA <= 75 ? 'var(--color-success)' : sol.porcentajeSLA <= 100 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{sol.porcentajeSLA}%</p>
          </div>
          {sol.fechaResolucion && (
            <div>
              <p className="cx-label" style={sectionLabel}>Tiempo resolución</p>
              <p style={{ margin: 0 }}>{formatMinutos(sol.tiempoResolucionMinutos)}</p>
            </div>
          )}
          {sol.fechaResolucion && (
            <div>
              <p className="cx-label" style={sectionLabel}>Fecha resolución</p>
              <p style={{ margin: 0 }}>{formatFecha(sol.fechaResolucion)}</p>
            </div>
          )}
        </div>

        <div>
          <p className="cx-label" style={sectionLabel}>Descripción</p>
          <p style={{ margin: 0, fontSize: 13, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 12, lineHeight: 1.6 }}>{sol.descripcion}</p>
        </div>

        {Array.isArray(sol.archivosAdjuntos) && sol.archivosAdjuntos.length > 0 && (
          <ArchivoViewer archivos={sol.archivosAdjuntos} />
        )}

        {puedeGestionar && estadosSiguientes[sol.estado]?.length > 0 && (
          <div>
            <p className="cx-label" style={sectionLabel}>Cambiar estado</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {estadosSiguientes[sol.estado].map(e => (
                <Button key={e} variant="secondary" size="sm" loading={saving} onClick={() => handleEstadoClick(e)}>
                  <RefreshCw size={12} />
                  {ESTADOS_LABEL[e]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {(sol.estado === 'resuelto' || sol.estado === 'cerrado') && (
          <div>
            <p className="cx-label" style={sectionLabel}>Calificación del servicio</p>
            {sol.calificacion ? (
              <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={18} color="var(--color-accent)" fill={n <= sol.calificacion ? 'var(--color-accent)' : 'none'} />
                  ))}
                  <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>{sol.calificacion}/5</span>
                </div>
                {sol.comentarioCalificacion && (
                  <p className="text-muted" style={{ margin: 0, fontSize: 13, fontStyle: 'italic' }}>"{sol.comentarioCalificacion}"</p>
                )}
              </div>
            ) : (
              <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHoverCalif(n)}
                      onMouseLeave={() => setHoverCalif(0)}
                      onClick={() => setCalificacion(n)}
                      style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer' }}
                    >
                      <Star size={24} color="var(--color-accent)" fill={n <= (hoverCalif || calificacion) ? 'var(--color-accent)' : 'none'} />
                    </button>
                  ))}
                  {calificacion > 0 && (
                    <span className="text-muted" style={{ marginLeft: 8, fontSize: 13 }}>
                      {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][calificacion]}
                    </span>
                  )}
                </div>
                <textarea
                  value={comentarioCalif}
                  onChange={e => setComentarioCalif(e.target.value)}
                  rows={2}
                  placeholder="Comentario opcional sobre el servicio..."
                  className="cx-input"
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'none' }}
                />
                <Button variant="primary" size="sm" loading={savingCalif} disabled={!calificacion} onClick={enviarCalificacion} style={{ alignSelf: 'flex-start' }}>
                  Enviar calificación
                </Button>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="cx-label" style={sectionLabel}>Comentarios ({Array.isArray(sol.comentarios) ? sol.comentarios.length : 0})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto', marginBottom: 12 }}>
            {(Array.isArray(sol.comentarios) ? sol.comentarios : []).map(c => (
              <div key={c.id} style={{ fontSize: 13, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{c.autor}</span>
                  <span className="text-muted" style={{ fontSize: 11 }}>{formatFecha(c.fecha)}</span>
                </div>
                <p style={{ margin: 0 }}>{c.texto}</p>
              </div>
            ))}
            {(!sol.comentarios || sol.comentarios.length === 0) && (
              <p className="text-muted" style={{ fontSize: 13, fontStyle: 'italic', margin: 0 }}>Sin comentarios aún</p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              rows={2}
              placeholder="Agregar un comentario..."
              className="cx-input"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none' }}
            />
            <Button variant="secondary" size="sm" loading={saving} onClick={enviarComentario} style={{ alignSelf: 'flex-end' }}>
              <MessageSquare size={15} />
              Comentar
            </Button>
          </div>
        </div>

        {(sol.pdf || sol.formularioRespuesta) ? (
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <p className="cx-label" style={sectionLabel}>Formulario asociado</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13 }}>{(sol.formularioRespuesta?.formulario?.nombre) || 'Formulario adjunto'}</span>
              {(sol.pdf?.urlCloudinary || sol.formularioRespuesta?.pdf?.urlCloudinary) && (
                <a
                  href={sol.pdf?.urlCloudinary || sol.formularioRespuesta?.pdf?.urlCloudinary}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cx-btn cx-btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
                >
                  Descargar PDF
                </a>
              )}
            </div>
          </div>
        ) : (canAsociar && (
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <p className="cx-label" style={sectionLabel}>Formulario asociado</p>
            {showAsociar ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loadingRespuestas ? (
                  <p className="text-muted" style={{ fontSize: 13 }}>Cargando respuestas...</p>
                ) : respuestas.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>No hay respuestas de formularios disponibles.</p>
                ) : (
                  <Select
                    value={respuestaSeleccionada}
                    onChange={setRespuestaSeleccionada}
                    placeholder="Seleccionar respuesta..."
                    options={[
                      { value: '', label: 'Seleccionar respuesta...' },
                      ...respuestas.map(r => ({
                        value: String(r.id),
                        label: `${r.formulario?.nombre || 'Formulario'} — ${r.respondedor?.nombre || ''}`,
                      })),
                    ]}
                  />
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" size="sm" disabled={!respuestaSeleccionada || loadingRespuestas} onClick={confirmarAsociar}>
                    Asociar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowAsociar(false); setRespuestaSeleccionada(''); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={abrirAsociar}
                className="cx-btn cx-btn-ghost"
                style={{ fontSize: 12, border: '1px dashed var(--color-border-strong)' }}
              >
                + Asociar respuesta de formulario
              </button>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>

      {showMotivoRechazo && (
        <div className="cx-dialog-backdrop" style={{ zIndex: 110 }}>
          <div className="cx-dialog" style={{ width: '100%', maxWidth: 420 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Rechazar solicitud</h3>
            <p className="text-muted" style={{ margin: '0 0 16px', fontSize: 13 }}>Documenta obligatoriamente el motivo del rechazo.</p>
            <textarea
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              rows={3}
              placeholder="Motivo del rechazo..."
              className="cx-input"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none', marginBottom: 16 }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setShowMotivoRechazo(false)}>Cancelar</Button>
              <Button variant="danger" size="sm" loading={saving} disabled={!motivoRechazo.trim()} onClick={confirmarRechazo}>
                Confirmar rechazo
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
