import { useState, useEffect, useRef } from 'react';
import { X, Download, FileText, ImageIcon, Film, Music, FileSpreadsheet, Eye, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

function getKind(nombre) {
  const ext = (nombre || '').split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return 'image';
  if (ext === 'pdf')                                   return 'pdf';
  if (['mp4','webm','avi','mov'].includes(ext))        return 'video';
  if (['mp3','wav','ogg','m4a'].includes(ext))         return 'audio';
  return 'other';
}

function getIcon(nombre) {
  const kind = getKind(nombre);
  if (kind === 'image') return { Icon: ImageIcon, color: 'var(--color-info)' };
  if (kind === 'pdf')   return { Icon: FileText,   color: 'var(--color-danger)' };
  if (kind === 'video') return { Icon: Film,       color: 'var(--color-accent)' };
  if (kind === 'audio') return { Icon: Music,      color: 'var(--color-accent)' };
  const ext = (nombre || '').split('.').pop().toLowerCase();
  if (['xls','xlsx'].includes(ext)) return { Icon: FileSpreadsheet, color: 'var(--color-success)' };
  return { Icon: FileText, color: 'var(--color-accent)' };
}

// Cloudinary PDFs subidos con resource_type:'auto' quedan en image/upload y requieren
// autenticación en algunos planes. Forzar raw/upload para entregarlos públicamente.
function fixCloudinaryUrl(url, nombre) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const ext = (nombre || '').split('.').pop().toLowerCase();
  const docExts = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp4', 'webm', 'avi', 'mov', 'mp3', 'wav', 'ogg', 'm4a']);
  if (docExts.has(ext) && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/raw/upload/');
  }
  return url;
}

// Descarga cross-origin con nombre correcto usando fetch + blob
async function downloadBlob(url, nombre) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Si CORS falla, abrir en nueva pestaña como fallback
    window.open(url, '_blank');
  }
}

function PreviewPanel({ archivo, onClose }) {
  const url = fixCloudinaryUrl(archivo.ruta, archivo.nombre);
  const kind = getKind(archivo.nombre);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const blobRef = useRef(null);

  useEffect(() => {
    if (kind !== 'pdf') return;
    setPdfLoading(true);
    setPdfError(false);
    // Fetch como blob para evitar el Content-Disposition: attachment de Cloudinary raw
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const bu = URL.createObjectURL(blob);
        blobRef.current = bu;
        setPdfBlobUrl(bu);
        setPdfLoading(false);
      })
      .catch(() => {
        setPdfError(true);
        setPdfLoading(false);
      });
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, [url, kind]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, black 70%, transparent)', padding: 16 }} onClick={onClose}>
      <div className="cx-dialog" style={{ position: 'relative', width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', flex: 'none' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>{archivo.nombre}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
            <button type="button" onClick={() => downloadBlob(url, archivo.nombre)} className="cx-btn cx-btn-ghost cx-btn-icon" title="Descargar">
              <Download size={16} />
            </button>
            <button type="button" onClick={onClose} className="cx-btn cx-btn-ghost cx-btn-icon">
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)', minHeight: 0 }}>
          {kind === 'image' && (
            <img src={url} alt={archivo.nombre} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 8 }} />
          )}
          {kind === 'pdf' && (
            pdfLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--color-text-muted)' }}>
                <Loader2 size={32} className="cx-spinner" />
                <p style={{ fontSize: 13 }}>Cargando PDF...</p>
              </div>
            ) : pdfError ? (
              <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <AlertCircle size={40} color="var(--color-danger)" />
                <p className="text-muted" style={{ fontSize: 13 }}>No se pudo cargar el PDF.</p>
                <button type="button" onClick={() => window.open(url, '_blank')} className="cx-btn cx-btn-primary">
                  <ExternalLink size={14} />
                  Abrir en nueva pestaña
                </button>
              </div>
            ) : (
              <iframe src={pdfBlobUrl} title={archivo.nombre} style={{ width: '100%', height: '100%', minHeight: '60vh', border: 'none' }} />
            )
          )}
          {kind === 'video' && (
            <video controls style={{ maxWidth: '100%', maxHeight: '70vh' }}>
              <source src={url} />
            </video>
          )}
          {kind === 'audio' && (
            <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-accent-subtle-bg)', display: 'grid', placeItems: 'center' }}>
                <Music size={36} color="var(--color-accent-subtle-text)" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{archivo.nombre}</p>
              <audio controls style={{ width: '100%', maxWidth: 320 }}>
                <source src={url} />
              </audio>
            </div>
          )}
          {kind === 'other' && (
            <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <FileText size={48} color="var(--color-text-muted)" />
              <p style={{ fontSize: 13, fontWeight: 600 }}>{archivo.nombre}</p>
              <p className="text-muted" style={{ fontSize: 12 }}>Vista previa no disponible para este tipo de archivo.</p>
              <button type="button" onClick={() => downloadBlob(url, archivo.nombre)} className="cx-btn cx-btn-primary">
                <Download size={15} />
                Descargar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ArchivoViewer({ archivos }) {
  const [selected, setSelected] = useState(null);

  const list = Array.isArray(archivos) ? archivos : [];
  if (!list.length) return null;

  return (
    <>
      <div>
        <p className="cx-label" style={{ margin: '0 0 8px' }}>Archivos adjuntos ({list.length})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map((a, i) => {
            const { Icon, color } = getIcon(a.nombre);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(a)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', textAlign: 'left' }}
              >
                <Icon size={16} color={color} style={{ flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</p>
                  {a.size && <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>{(a.size / 1024).toFixed(0)} KB</p>}
                </div>
                <Eye size={14} color="var(--color-text-muted)" style={{ flex: 'none' }} />
              </button>
            );
          })}
        </div>
      </div>

      {selected && <PreviewPanel archivo={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
