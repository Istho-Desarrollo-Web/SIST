import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { Select } from '../components/common/Select';
import { Skeleton } from '../components/common/Skeleton';
import { formulariosApi } from '../services/formulariosApi';

export function FormularioPDFsPage() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (filtroFormulario && String(p.formulario?.id) !== filtroFormulario) return false;
    if (filtroFechaDesde && new Date(p.createdAt) < new Date(filtroFechaDesde)) return false;
    if (filtroFechaHasta && new Date(p.createdAt) > new Date(filtroFechaHasta + 'T23:59:59')) return false;
    return true;
  });

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

      {/* Filtros */}
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

      {/* Tabla */}
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
                    {new Date(r.createdAt).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.pdf?.urlCloudinary && (
                      <a
                        href={r.pdf.urlCloudinary}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-navy-50 dark:bg-navy-700 text-navy-600 dark:text-slate-300 hover:bg-navy-100 dark:hover:bg-navy-600 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
