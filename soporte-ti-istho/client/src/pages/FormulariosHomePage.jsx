import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, FileText, Download, Pencil, ClipboardList, Loader2, Eye } from 'lucide-react';
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
      <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map((i) => <div key={i} className="cx-skeleton" style={{ height: 72, width: '100%' }} />)}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle-bg)', color: 'var(--color-accent-subtle-text)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <FileText size={21} />
        </span>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 23, margin: '0 0 2px', letterSpacing: '-0.01em' }}>Formularios</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Solicita, diligencia y administra formularios TI</p>
        </div>
      </div>

      <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>Formularios disponibles para ti</h2>
      {disponibles.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>No hay formularios disponibles en este momento.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: isAdminOrTecnico ? 32 : 0 }}>
          {disponibles.map((f) => (
            <div key={f.id} className="cx-card cx-elev-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
                <FileText size={18} color="var(--color-accent)" style={{ flex: 'none', marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{f.nombre}</p>
                  {f.descripcion && <p className="text-muted" style={{ margin: '2px 0 6px', fontSize: 12 }}>{f.descripcion}</p>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`cx-tag ${f.acceso === 'publico' ? 'cx-tag-success' : 'cx-tag-outline'}`}>{f.acceso === 'publico' ? 'Público' : 'Autenticado'}</span>
                    {f.plantillas?.length > 0 && <span className="cx-tag cx-tag-info">Con PDF</span>}
                  </div>
                </div>
              </div>
              <button type="button" className="cx-btn cx-btn-primary" style={{ flex: 'none' }} onClick={() => navigate(`/formularios/${f.id}/responder`)}>Llenar formulario</button>
            </div>
          ))}
        </div>
      )}

      {isAuthenticated && misPdfs.length > 0 && (
        <div style={{ marginBottom: isAdminOrTecnico ? 32 : 0 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>Mis respuestas recientes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {misPdfs.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13 }}>{r.formulario?.nombre}</p>
                  <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>
                    {(() => { const d = new Date(r.createdAt ?? r.created_at); return isNaN(d) ? '—' : d.toLocaleDateString('es-CO'); })()}
                  </p>
                </div>
                {r.pdf?.urlCloudinary && (
                  <button type="button" onClick={() => descargar(r)} disabled={descargando === r.id} className="cx-btn cx-btn-ghost cx-btn-icon">
                    {descargando === r.id ? <Loader2 size={16} className="cx-spinner" /> : <Download size={16} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdminOrTecnico && (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>Administración</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            <button type="button" className="cx-card cx-elev-sm cx-card-hover" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 18, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/formularios')}>
              <ClipboardList size={20} color="var(--color-text-secondary)" />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Mis formularios</span>
            </button>
            <button type="button" className="cx-card cx-elev-sm cx-card-hover" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 18, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/formularios/pdfs')}>
              <FileText size={20} color="var(--color-text-secondary)" />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>PDFs generados</span>
            </button>
            <button type="button" className="cx-card cx-elev-sm cx-card-hover" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 18, textAlign: 'center', cursor: 'pointer', background: 'var(--color-accent-subtle-bg)', borderColor: 'var(--color-accent)' }} onClick={() => navigate('/formularios/nuevo')}>
              <Plus size={20} color="var(--color-accent-subtle-text)" />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-accent-subtle-text)' }}>Nuevo formulario</span>
            </button>
          </div>

          {misFormularios.length > 0 && (
            <div className="cx-card cx-elev-sm" style={{ overflow: 'hidden' }}>
              <table className="cx-table">
                <thead><tr><th>Nombre</th><th>Acceso</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {misFormularios.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.nombre}</td>
                      <td className="text-muted" style={{ textTransform: 'capitalize' }}>{f.acceso}</td>
                      <td><span className={`cx-tag ${f.activo ? 'cx-tag-success' : 'cx-tag-neutral'}`}>{f.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" title="Ver respuestas" onClick={() => navigate(`/formularios/${f.id}/respuestas`)}><Eye size={14} /></button>
                        <button type="button" className="cx-btn cx-btn-ghost cx-btn-icon" title="Editar formulario" onClick={() => navigate(`/formularios/${f.id}/editar`)}><Pencil size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
