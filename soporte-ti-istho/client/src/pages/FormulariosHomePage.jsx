import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, FileText, Download, Pencil, ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Skeleton } from '../components/common/Skeleton';
import { formulariosApi } from '../services/formulariosApi';
import { useAuth } from '../context/AuthContext';

export function FormulariosHomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdminOrTecnico = isAuthenticated && ['admin', 'tecnico'].includes(user?.rol);

  const [disponibles, setDisponibles] = useState([]);
  const [misFormularios, setMisFormularios] = useState([]);
  const [misPdfs, setMisPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(null);

  async function descargar(r) {
    setDescargando(r.id);
    try {
      const resp = await formulariosApi.descargarPdf(r.id);
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(r.formulario?.nombre || 'formulario').replace(/[^a-zA-Z0-9]/g, '_')}_${r.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar el PDF');
    } finally {
      setDescargando(null);
    }
  }

  useEffect(() => {
    const promises = [formulariosApi.listarDisponibles()];
    if (isAdminOrTecnico) {
      promises.push(formulariosApi.listar());
      promises.push(formulariosApi.listarPdfs());
    } else if (isAuthenticated) {
      promises.push(formulariosApi.listarPdfs());
    }
    Promise.all(promises)
      .then(([dispRes, formRes, pdfRes]) => {
        setDisponibles(dispRes.data.data || []);
        if (formRes) setMisFormularios((formRes.data.data || []).slice(0, 5));
        if (pdfRes) setMisPdfs((pdfRes.data.data || []).slice(0, 5));
        setLoading(false);
      })
      .catch(() => { toast.error('Error al cargar formularios'); setLoading(false); });
  }, [isAdminOrTecnico, isAuthenticated]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
        {[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-10">

      {/* Sección 1: Formularios disponibles */}
      <section>
        <h2 className="text-lg font-bold text-navy-700 dark:text-slate-100 mb-4">
          Formularios disponibles para ti
        </h2>
        {disponibles.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic">
            No hay formularios disponibles en este momento.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {disponibles.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-800"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{f.nombre}</p>
                    {f.descripcion && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.descripcion}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <Badge variant={f.acceso === 'publico' ? 'success' : 'default'}>
                        {f.acceso === 'publico' ? 'Público' : 'Autenticado'}
                      </Badge>
                      {f.plantillas?.length > 0 && (
                        <Badge variant="info">Con PDF</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/formularios/${f.id}/responder`)}
                >
                  Llenar formulario
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Mis respuestas recientes */}
        {isAuthenticated && misPdfs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
              Mis respuestas recientes
            </h3>
            <div className="flex flex-col gap-2">
              {misPdfs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-2 rounded-lg bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-600"
                >
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{r.formulario?.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {(() => { const d = new Date(r.createdAt ?? r.created_at); return isNaN(d) ? '—' : d.toLocaleDateString('es-CO'); })()}
                    </p>
                  </div>
                  {r.pdf?.urlCloudinary && (
                    <button
                      onClick={() => descargar(r)}
                      disabled={descargando === r.id}
                      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-500 disabled:opacity-50"
                    >
                      {descargando === r.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Sección 2: Administración (solo admin/tecnico) */}
      {isAdminOrTecnico && (
        <section>
          <h2 className="text-lg font-bold text-navy-700 dark:text-slate-100 mb-4">
            Administración
          </h2>

          {/* Grid de accesos rápidos */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Link
              to="/formularios"
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-800 hover:border-orange-300 dark:hover:border-orange-600 transition-colors text-center"
            >
              <ClipboardList className="w-6 h-6 text-navy-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mis formularios</span>
            </Link>
            <Link
              to="/formularios/pdfs"
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-800 hover:border-orange-300 dark:hover:border-orange-600 transition-colors text-center"
            >
              <FileText className="w-6 h-6 text-navy-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">PDFs generados</span>
            </Link>
            <button
              onClick={() => navigate('/formularios/nuevo')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-center"
            >
              <Plus className="w-6 h-6 text-orange-500" />
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Nuevo formulario</span>
            </button>
          </div>

          {/* Tabla compacta de formularios recientes */}
          {misFormularios.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-navy-600 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-navy-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nombre</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Acceso</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Estado</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-navy-600">
                  {misFormularios.map((f) => (
                    <tr key={f.id} className="bg-white dark:bg-navy-800">
                      <td className="px-4 py-2 text-slate-800 dark:text-slate-100 font-medium">{f.nombre}</td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400 capitalize">{f.acceso}</td>
                      <td className="px-4 py-2">
                        <Badge variant={f.activo ? 'success' : 'default'}>{f.activo ? 'Activo' : 'Inactivo'}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => navigate(`/formularios/${f.id}/editar`)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-500"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
