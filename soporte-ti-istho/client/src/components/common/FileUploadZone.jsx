import { useRef, useState } from 'react';
import { Upload, X, FileText, ImageIcon, Film, Music, FileSpreadsheet } from 'lucide-react';

const MAX_FILES = 3;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function isAccepted(file, accept) {
  const parts = accept.split(',').map((s) => s.trim().toLowerCase());
  const name = file.name.toLowerCase();
  return parts.some((p) => (p.startsWith('.') ? name.endsWith(p) : file.type.toLowerCase() === p));
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return { Icon: ImageIcon, color: 'var(--color-info)' };
  if (['mp4','webm','avi','mov'].includes(ext))        return { Icon: Film,      color: 'var(--color-accent)' };
  if (['mp3','wav','ogg','m4a'].includes(ext))         return { Icon: Music,     color: 'var(--color-accent)' };
  if (['xls','xlsx'].includes(ext))                   return { Icon: FileSpreadsheet, color: 'var(--color-success)' };
  return { Icon: FileText, color: 'var(--color-accent)' };
}

export function FileUploadZone({ files, onChange, accept }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const inputAccept = accept || '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.webm,.avi,.mov,.mp3,.wav,.ogg,.m4a';

  const addFiles = (incoming) => {
    const toAdd = [];
    for (const f of incoming) {
      if (files.length + toAdd.length >= MAX_FILES) break;
      if (f.size > MAX_SIZE_BYTES) continue;
      if (accept && !isAccepted(f, accept)) continue;
      if (!files.some(e => e.name === f.name && e.size === f.size)) toAdd.push(f);
    }
    if (toAdd.length) onChange([...files, ...toAdd]);
  };

  const remove = (i) => onChange(files.filter((_, idx) => idx !== i));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const full = files.length >= MAX_FILES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !full && inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
          borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center',
          opacity: full ? 0.5 : 1, cursor: full ? 'not-allowed' : 'pointer',
          background: dragging ? 'var(--accent-100)' : 'transparent',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={inputAccept}
          style={{ display: 'none' }}
          onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
        />
        <Upload size={20} color="var(--color-text-muted)" style={{ margin: '0 auto 4px' }} />
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
          {full ? 'Límite de archivos alcanzado' : 'Clic o arrastra archivos aquí'}
        </p>
        <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
          Máx. {MAX_FILES} archivos · 10 MB c/u
        </p>
        <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>
          {accept ? accept.toUpperCase().replace(/\./g, '').split(',').join(', ') : 'Word, Excel, PPT, PDF, Imagen, Video, Audio'}
        </p>
      </div>

      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => {
            const { Icon, color } = getFileIcon(f.name);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <Icon size={16} color={color} style={{ flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</p>
                  <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>{(f.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" onClick={() => remove(i)} className="cx-btn cx-btn-ghost cx-btn-icon" style={{ padding: 4, flex: 'none' }}>
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
