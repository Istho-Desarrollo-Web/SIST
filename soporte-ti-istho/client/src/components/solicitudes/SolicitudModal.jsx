import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, RefreshCw, Star } from 'lucide-react';
import { solicitudService } from '../../services/solicitudService';
import { formulariosApi } from '../../services/formulariosApi';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { EstadoBadge } from './EstadoBadge';
import { PrioridadBadge } from './PrioridadBadge';
import { SLAIndicator } from './SLAIndicator';
import { ArchivoViewer } from './ArchivoViewer';
import { formatFecha, formatMinutos } from '../../utils/formatters';
import { ESTADOS_LABEL, TIPOS_SOLICITUD_LABEL } from '../../utils/constants';
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
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al cambiar estado';
      toast.error(msg);
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
    await cambiarEstado('rechazado', motivoRechazo.trim());
    setShowMotivoRechazo(false);
    setMotivoRechazo('');
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

  return (
    <Modal open onClose={onClose} title={`Solicitud ${sol.numero}`} size="lg">
      <div className="space-y-5">
        {/* Cabecera */}
        <div className="flex flex-wrap gap-3 items-center">
          <EstadoBadge estado={sol.estado} />
          <PrioridadBadge prioridad={sol.prioridad} />
          <span className="text-xs text-slate-500 dark:text-slate-400">{TIPOS_SOLICITUD_LABEL[sol.tipoSolicitud]}</span>
        </div>

        {/* Info */}
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Empleado</p>
            <p className="font-medium text-navy-500 dark:text-white">{sol.empleado?.nombreCompleto}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{sol.empleado?.area}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Técnico asignado</p>
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
              <p className="font-medium text-navy-500 dark:text-white">{sol.tecnico?.nombre || 'Sin asignar'}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Creado</p>
            <p className="text-slate-700 dark:text-slate-300">{formatFecha(sol.fechaCreacion)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Límite resolución</p>
            <p className="text-slate-700 dark:text-slate-300">{formatFecha(sol.fechaLimiteResolucion)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">SLA consumido</p>
            <SLAIndicator porcentaje={sol.porcentajeSLA} />
          </div>
          {sol.fechaResolucion && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tiempo resolución</p>
              <p className="text-slate-700 dark:text-slate-300">{formatMinutos(sol.tiempoResolucionMinutos)}</p>
            </div>
          )}
          {sol.fechaResolucion && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Fecha resolución</p>
              <p className="text-slate-700 dark:text-slate-300">{formatFecha(sol.fechaResolucion)}</p>
            </div>
          )}
        </div>

        {/* Descripción */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Descripción</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-navy-800 rounded-lg p-3 leading-relaxed">{sol.descripcion}</p>
        </div>

        {/* Archivos adjuntos */}
        {Array.isArray(sol.archivosAdjuntos) && sol.archivosAdjuntos.length > 0 && (
          <ArchivoViewer archivos={sol.archivosAdjuntos} />
        )}

        {/* Cambiar estado */}
        {puedeGestionar && estadosSiguientes[sol.estado]?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Cambiar estado</p>
            <div className="flex flex-wrap gap-2">
              {estadosSiguientes[sol.estado].map(e => (
                <Button key={e} variant="outline" size="sm" loading={saving} onClick={() => handleEstadoClick(e)}>
                  <RefreshCw size={12} />
                  {ESTADOS_LABEL[e]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Calificación del servicio */}
        {(sol.estado === 'resuelto' || sol.estado === 'cerrado') && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Calificación del servicio</p>
            {sol.calificacion ? (
              <div className="bg-slate-50 dark:bg-navy-800 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={18} className={n <= sol.calificacion ? 'fill-orange-500 text-orange-500' : 'text-slate-300 dark:text-slate-600'} />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-orange-500">{sol.calificacion}/5</span>
                </div>
                {sol.comentarioCalificacion && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{sol.comentarioCalificacion}"</p>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-navy-800 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-1 flex-wrap">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHoverCalif(n)}
                      onMouseLeave={() => setHoverCalif(0)}
                      onClick={() => setCalificacion(n)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star size={26} className={n <= (hoverCalif || calificacion) ? 'fill-orange-500 text-orange-500' : 'text-slate-300 dark:text-slate-600'} />
                    </button>
                  ))}
                  {calificacion > 0 && (
                    <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                      {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][calificacion]}
                    </span>
                  )}
                </div>
                <textarea
                  value={comentarioCalif}
                  onChange={e => setComentarioCalif(e.target.value)}
                  rows={2}
                  placeholder="Comentario opcional sobre el servicio..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                />
                <Button variant="primary" size="sm" loading={savingCalif} disabled={!calificacion} onClick={enviarCalificacion}>
                  Enviar calificación
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Comentarios */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Comentarios ({Array.isArray(sol.comentarios) ? sol.comentarios.length : 0})
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
            {(Array.isArray(sol.comentarios) ? sol.comentarios : []).map(c => (
              <div key={c.id} className="text-sm bg-slate-50 dark:bg-navy-800 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-navy-500 dark:text-white">{c.autor}</span>
                  <span className="text-xs text-slate-400">{formatFecha(c.fecha)}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">{c.texto}</p>
              </div>
            ))}
            {(!sol.comentarios || sol.comentarios.length === 0) && (
              <p className="text-sm text-slate-400 italic">Sin comentarios aún</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              rows={2}
              placeholder="Agregar un comentario..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
            />
            <Button variant="secondary" size="sm" loading={saving} onClick={enviarComentario} className="self-end">
              <MessageSquare size={15} />
              Comentar
            </Button>
          </div>
        </div>

        {/* Formulario asociado */}
        {(sol.pdf || sol.formularioRespuesta) ? (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-navy-600">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
              Formulario asociado
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {(sol.formularioRespuesta?.formulario?.nombre) || 'Formulario adjunto'}
              </span>
              {(sol.pdf?.urlCloudinary || sol.formularioRespuesta?.pdf?.urlCloudinary) && (
                <a
                  href={sol.pdf?.urlCloudinary || sol.formularioRespuesta?.pdf?.urlCloudinary}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1.5 rounded bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-slate-300 hover:bg-navy-200 dark:hover:bg-navy-600 flex items-center gap-1"
                >
                  Descargar PDF
                </a>
              )}
            </div>
          </div>
        ) : (canAsociar && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-navy-600">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
              Formulario asociado
            </h4>
            {showAsociar ? (
              <div className="space-y-2">
                {loadingRespuestas ? (
                  <p className="text-sm text-slate-400">Cargando respuestas...</p>
                ) : respuestas.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No hay respuestas de formularios disponibles.</p>
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
                <div className="flex gap-2">
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
                onClick={abrirAsociar}
                className="text-xs px-3 py-1.5 rounded border border-dashed border-slate-300 dark:border-navy-500 text-slate-500 dark:text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors"
              >
                + Asociar respuesta de formulario
              </button>
            )}
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>

      {/* Modal de motivo de rechazo */}
      {showMotivoRechazo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-navy-500 dark:text-white mb-1">Rechazar solicitud</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Documenta obligatoriamente el motivo del rechazo.
            </p>
            <textarea
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              rows={3}
              placeholder="Motivo del rechazo..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowMotivoRechazo(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={saving}
                disabled={!motivoRechazo.trim()}
                onClick={confirmarRechazo}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirmar rechazo
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
