// soporte-ti-istho/client/src/pages/FormularioRespuestasPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Download, Eye, Loader2, Filter, X } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Skeleton } from '../components/common/Skeleton';
import { DatePicker } from '../components/common/DatePicker';
import { Pagination } from '../components/common/Pagination';
import { RespuestaDetalleModal } from '../components/formularios/RespuestaDetalleModal';
import { formulariosApi } from '../services/formulariosApi';
import { useAuth } from '../context/AuthContext';

function formatFecha(val) {
  const d = new Date(val);
  return isNaN(d) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FormularioRespuestasPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formularioNombre, setFormularioNombre] = useState('');
  const [respuestas, setRespuestas] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(null);
  const [detalleId, setDetalleId] = useState(null);

  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroBuscar, setFiltroBuscar] = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    formulariosApi.listarRespuestasFormulario(id, {
      page,
      limit: 20,
      ...(filtroDesde && { desde: filtroDesde }),
      ...(filtroHasta && { hasta: filtroHasta }),
      ...(filtroBuscar && { buscar: filtroBuscar }),
    })
      .then((res) => {
        const { formulario, respuestas: rows, total: t, totalPages: tp } = res.data.data;
        if (formulario?.nombre) setFormularioNombre(formulario.nombre);
        setRespuestas(rows);
        setTotal(t);
        setTotalPages(tp);
        setLoading(false);
      })
      .catch(() => { toast.error('Error al cargar respuestas'); setLoading(false); });
  }, [id, page, filtroDesde, filtroHasta, filtroBuscar]);

  useEffect(() => { cargar(); }, [cargar]);

  const hayFiltros = filtroDesde || filtroHasta || filtroBuscar;

  function limpiarFiltros() {
    setFiltroDesde('');
    setFiltroHasta('');
    setFiltroBuscar('');
    setPage(1);
  }

  async function exportar(formato) {
    setExportando(formato);
    try {
      const res = await formulariosApi.exportarRespuestas(id, formato);
      const url = URL.createObjectURL(
        new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `respuestas-${(formularioNombre || 'formulario').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar');
    } finally {
      setExportando(null);
    }
  }

  const resolverNombre = (r) => r.respondedor?.nombre || r.nombreRespondente || 'Anónimo';

  if (loading && respuestas.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate('/formularios')}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            Volver
          </button>
          <h1 className="text-xl font-bold text-navy-700 dark:text-slate-100">
            {formularioNombre ? `Respuestas: ${formularioNombre}` : 'Respuestas'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{total} respuestas</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportar('resumen')}
            disabled={!!exportando}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            {exportando === 'resumen'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            Resumen
          </button>
          <button
            onClick={() => exportar('detalle')}
            disabled={!!exportando}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            {exportando === 'detalle'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            Detalle
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-5 p-4 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Filtros</span>
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
            >
              <X size={12} />
              Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DatePicker
            value={filtroDesde}
            onChange={(v) => { setFiltroDesde(v); setPage(1); }}
            placeholder="Desde..."
          />
          <DatePicker
            value={filtroHasta}
            onChange={(v) => { setFiltroHasta(v); setPage(1); }}
            placeholder="Hasta..."
          />
          <input
            value={filtroBuscar}
            onChange={(e) => { setFiltroBuscar(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Estado vacío */}
      {respuestas.length === 0 ? (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
          No hay respuestas{hayFiltros ? ' con los filtros aplicados' : ''}.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-navy-600 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-navy-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Respondido por</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-navy-600">
                {respuestas.map((r) => (
                  <tr key={r.id} className="bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700">
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500">{r.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{resolverNombre(r)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatFecha(r.createdAt ?? r.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.estado === 'completado' ? 'success' : 'warning'}>
                        {r.estado === 'completado' ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetalleId(r.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-navy-50 dark:bg-navy-700 text-navy-600 dark:text-slate-300 hover:bg-navy-100 dark:hover:bg-navy-600 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <RespuestaDetalleModal
        respuestaId={detalleId}
        onClose={() => setDetalleId(null)}
      />
    </div>
  );
}
