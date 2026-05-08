import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, RefreshCw, Star } from 'lucide-react';
import { solicitudService } from '../../services/solicitudService';
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
  const [calificacion, setCalificacion] = useState(init.calificacion || 0);
  const [hoverCalif, setHoverCalif] = useState(0);
  const [comentarioCalif, setComentarioCalif] = useState(init.comentarioCalificacion || '');
  const [savingCalif, setSavingCalif] = useState(false);

  const puedeGestionar = user.rol === 'admin' || user.rol === 'tecnico';

  const cambiarEstado = async (estado) => {
    setSaving(true);
    try {
      const res = await solicitudService.cambiarEstado(sol.id, estado);
      setSol(res.data.data);
      toast.success('Estado actualizado');
    } catch { toast.error('Error al cambiar estado'); }
    finally { setSaving(false); }
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
    abierto: ['en_proceso', 'cancelado'],
    en_proceso: ['pendiente_usuario', 'pendiente_externo', 'resuelto', 'cancelado'],
    pendiente_usuario: ['en_proceso', 'resuelto', 'cancelado'],
    pendiente_externo: ['en_proceso', 'resuelto', 'cancelado'],
    resuelto: ['cerrado', 'en_proceso'],
    cerrado: [],
    cancelado: [],
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
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Empleado</p>
            <p className="font-medium text-navy-500 dark:text-white">{sol.empleado?.nombreCompleto}</p>
            <p className="text-slate-500 dark:text-slate-400">{sol.empleado?.area}</p>
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
        {sol.archivosAdjuntos?.length > 0 && (
          <ArchivoViewer archivos={sol.archivosAdjuntos} />
        )}

        {/* Cambiar estado */}
        {puedeGestionar && estadosSiguientes[sol.estado]?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Cambiar estado</p>
            <div className="flex flex-wrap gap-2">
              {estadosSiguientes[sol.estado].map(e => (
                <Button key={e} variant="outline" size="sm" loading={saving} onClick={() => cambiarEstado(e)}>
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

          <div className="flex gap-2">
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              rows={2}
              placeholder="Agregar un comentario..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
            />
            <Button variant="secondary" loading={saving} onClick={enviarComentario}>
              <MessageSquare size={15} />
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
}
