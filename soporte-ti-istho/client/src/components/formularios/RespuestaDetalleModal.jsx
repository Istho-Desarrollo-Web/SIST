// soporte-ti-istho/client/src/components/formularios/RespuestaDetalleModal.jsx
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { formulariosApi } from '../../services/formulariosApi';

function formatFecha(val) {
  const d = new Date(val);
  return isNaN(d) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function RespuestaDetalleModal({ respuestaId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!respuestaId) { setData(null); return; }
    setLoading(true);
    formulariosApi.obtenerDetalleRespuesta(respuestaId)
      .then((res) => { setData(res.data.data); setLoading(false); })
      .catch(() => { toast.error('Error al cargar el detalle'); setLoading(false); onClose(); });
  }, [respuestaId]);

  const resolverNombre = (r) => r.respondedor?.nombre || r.nombreRespondente || 'Anónimo';

  return (
    <Modal
      open={Boolean(respuestaId)}
      onClose={onClose}
      title={`Respuesta #${respuestaId}`}
      size="md"
    >
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      )}

      {!loading && data && (
        <div className="flex flex-col gap-5">
          {/* Meta info */}
          <div className="flex flex-wrap gap-3 pb-4 border-b border-slate-200 dark:border-navy-600">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Respondido por</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{resolverNombre(data.respuesta)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Fecha</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{formatFecha(data.respuesta.createdAt ?? data.respuesta.created_at)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Estado</span>
              <Badge variant={data.respuesta.estado === 'completado' ? 'success' : 'warning'}>
                {data.respuesta.estado === 'completado' ? 'Completado' : 'Pendiente'}
              </Badge>
            </div>
          </div>

          {/* Campos */}
          {data.campos.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Sin campos registrados.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {data.campos.map((campo, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{campo.etiqueta}</span>
                  {campo.tipo === 'firma' && campo.archivoUrl ? (
                    <img
                      src={campo.archivoUrl}
                      alt={`Firma — ${campo.etiqueta}`}
                      className="max-h-24 rounded border border-slate-200 dark:border-navy-600 object-contain bg-white"
                    />
                  ) : campo.tipo === 'grilla' && campo.valor ? (
                    <GrillaViewer valor={campo.valor} />
                  ) : (
                    <span className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {campo.valor || <span className="italic text-slate-400 dark:text-slate-500">Sin respuesta</span>}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function GrillaViewer({ valor }) {
  let filas = [];
  try { filas = JSON.parse(valor); } catch { return <span className="text-sm text-slate-500">{valor}</span>; }
  if (!Array.isArray(filas) || filas.length === 0) return <span className="text-sm text-slate-400 italic">Sin datos</span>;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-navy-600 overflow-hidden">
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
          {filas.map((f, i) => (
            <tr key={i} className="bg-white dark:bg-navy-800">
              <td className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400 w-8">{f.fila + 1}</td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{f.columna ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
