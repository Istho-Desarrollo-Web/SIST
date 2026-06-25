import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, Filter, Trash2, Loader2 } from 'lucide-react';
import { Select } from '../components/common/Select';
import { Skeleton } from '../components/common/Skeleton';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formulariosApi } from '../services/formulariosApi';
import { useAuth } from '../context/AuthContext';

function formatFecha(val) {
  const d = new Date(val);
  return isNaN(d) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FormularioPDFsPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eliminando, setEliminando] = useState(null);
  const [descargando, setDescargando] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [filtroFormulario, setFiltroFormulario] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  useEffect(() => {
    formulariosApi.listarPdfs()
      .then((res) => { setPdfs(res.data.data || []); setLoading(false); })
      .catch(() => { toast.error('Error al cargar PDFs'); setLoading(false); });
  }, []);

  const formularioOptions = [
    { value: '', label: 'Todos los formularios' },
    ...Array.from(new Map(pdfs.map((p) => [p.formulario?.id, p.formulario?.nombre])))
      .filter(([id]) => id)
      .map(([id, nombre]) => ({ value: String(id), label: nombre })),
  ];

  const filtered = pdfs.filter((p) => {
    const fecha = new Date(p.createdAt ?? p.created_at);
    if (filtroFormulario && String(p.formulario?.id) !== filtroFormulario) return false;
    if (filtroFechaDesde && fecha < new Date(filtroFechaDesde)) return false;
    if (filtroFechaHasta && fecha > new Date(filtroFechaHasta + 'T23:59:59')) return false;
    return true;
  });

  async function descargar(row) {
    setDescargando(row.id);
    try {
      const resp = await formulariosApi.descargarPdf(row.id);
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(row.formulario?.nombre || 'formulario').replace(/[^a-zA-Z0-9]/g, '_')}_${row.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar el PDF');
    } finally {
      setDescargando(null);
    }
  }

  async function confirmarEliminar() {
    if (!confirmRow) return;
    const row = confirmRow;
    setConfirmRow(null);
    setEliminando(row.pdf?.id);
    try {
      await formulariosApi.eliminarPdf(row.pdf.id);
      setPdfs((prev) => prev.filter((p) => p.pdf?.id !== row.pdf.id));
      toast.success('PDF eliminado');
    } catch {
      toast.error('Error al eliminar el PDF');
    } finally {
      setEliminando(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-navy-700 dark:text-slate-100">PDFs Generados</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} registros</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600">
        <Filter className="w-4 h-4 text-slate-400 self-center shrink-0" />
        <Select
          value={filtroFormulario}
          onChange={setFiltroFormulario}
          options={formularioOptions}
          placeholder="Formulario..."
        />
        <input
          type="date"
          value={filtroFechaDesde}
          onChange={(e) => setFiltroFechaDesde(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-700 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
        <input
          type="date"
          value={filtroFechaHasta}
          onChange={(e) => setFiltroFechaHasta(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-700 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
        {(filtroFormulario || filtroFechaDesde || filtroFechaHasta) && (
          <button
            onClick={() => { setFiltroFormulario(''); setFiltroFechaDesde(''); setFiltroFechaHasta(''); }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
          No hay PDFs generados{filtroFormulario || filtroFechaDesde ? ' con los filtros aplicados' : ''}.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-navy-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Formulario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Respondente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Fecha</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-navy-600">
              {filtered.map((r) => (
                <tr key={r.id} className="bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-750">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {r.formulario?.nombre || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {r.respondedor?.nombre || 'Público'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatFecha(r.createdAt ?? r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {r.pdf && (
                        <button
                          onClick={() => descargar(r)}
                          disabled={descargando === r.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-navy-50 dark:bg-navy-700 text-navy-600 dark:text-slate-300 hover:bg-navy-100 dark:hover:bg-navy-600 transition-colors disabled:opacity-50"
                        >
                          {descargando === r.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Download className="w-3.5 h-3.5" />}
                          {descargando === r.id ? 'Descargando...' : 'Descargar'}
                        </button>
                      )}
                      {isAdmin && r.pdf?.id && (
                        <button
                          onClick={() => setConfirmRow(r)}
                          disabled={eliminando === r.pdf.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {eliminando === r.pdf.id ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmRow)}
        title="Eliminar PDF"
        message={`¿Eliminar el PDF de "${confirmRow?.formulario?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmRow(null)}
      />
    </div>
  );
}
