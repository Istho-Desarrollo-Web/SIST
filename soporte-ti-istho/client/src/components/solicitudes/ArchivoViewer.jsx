import { useState } from 'react';
import { X, Download, FileText, ImageIcon, Film, Music, FileSpreadsheet, Eye } from 'lucide-react';

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
  if (kind === 'image') return { Icon: ImageIcon,       color: 'text-blue-500' };
  if (kind === 'pdf')   return { Icon: FileText,         color: 'text-red-500' };
  if (kind === 'video') return { Icon: Film,             color: 'text-purple-500' };
  if (kind === 'audio') return { Icon: Music,            color: 'text-pink-500' };
  const ext = (nombre || '').split('.').pop().toLowerCase();
  if (['xls','xlsx'].includes(ext)) return { Icon: FileSpreadsheet, color: 'text-cgreen-600' };
  return { Icon: FileText, color: 'text-orange-500' };
}

function PreviewPanel({ archivo, onClose }) {
  const url = archivo.ruta;
  const kind = getKind(archivo.nombre);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-navy-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-navy-600 shrink-0">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate pr-4">{archivo.nombre}</p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              download={archivo.nombre}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-500 hover:text-orange-500 transition-colors"
              title="Descargar"
            >
              <Download size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-500 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-navy-900 min-h-0">
          {kind === 'image' && (
            <img src={url} alt={archivo.nombre} className="max-w-full max-h-full object-contain p-2" />
          )}
          {kind === 'pdf' && (
            <iframe src={url} title={archivo.nombre} className="w-full h-full min-h-[60vh]" style={{ border: 'none' }} />
          )}
          {kind === 'video' && (
            <video controls className="max-w-full max-h-full" style={{ maxHeight: '70vh' }}>
              <source src={url} />
            </video>
          )}
          {kind === 'audio' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto">
                <Music size={36} className="text-pink-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{archivo.nombre}</p>
              <audio controls className="w-full max-w-xs mx-auto">
                <source src={url} />
              </audio>
            </div>
          )}
          {kind === 'other' && (
            <div className="p-8 text-center space-y-3">
              <FileText size={48} className="mx-auto text-slate-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{archivo.nombre}</p>
              <p className="text-xs text-slate-400">Vista previa no disponible para este tipo de archivo.</p>
              <a
                href={url}
                download={archivo.nombre}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Download size={15} />
                Descargar
              </a>
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
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
          Archivos adjuntos ({list.length})
        </p>
        <div className="space-y-1.5">
          {list.map((a, i) => {
            const { Icon, color } = getIcon(a.nombre);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(a)}
                className="w-full flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-navy-800 hover:bg-slate-100 dark:hover:bg-navy-700 rounded-lg border border-slate-200 dark:border-navy-600 transition-colors group text-left"
              >
                <Icon size={16} className={color} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{a.nombre}</p>
                  {a.size && <p className="text-xs text-slate-400">{(a.size / 1024).toFixed(0)} KB</p>}
                </div>
                <Eye size={14} className="text-slate-400 group-hover:text-orange-500 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {selected && <PreviewPanel archivo={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
