import { useRef, useState } from 'react';
import { Upload, X, FileText, ImageIcon, Film, Music, FileSpreadsheet } from 'lucide-react';

const MAX_FILES = 3;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return { Icon: ImageIcon, color: 'text-blue-500' };
  if (['mp4','webm','avi','mov'].includes(ext))        return { Icon: Film,      color: 'text-purple-500' };
  if (['mp3','wav','ogg','m4a'].includes(ext))         return { Icon: Music,     color: 'text-pink-500' };
  if (['xls','xlsx'].includes(ext))                   return { Icon: FileSpreadsheet, color: 'text-cgreen-600' };
  return { Icon: FileText, color: 'text-orange-500' };
}

export function FileUploadZone({ files, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming) => {
    const toAdd = [];
    for (const f of incoming) {
      if (files.length + toAdd.length >= MAX_FILES) break;
      if (f.size > MAX_SIZE_BYTES) continue;
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
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !full && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors
          ${full ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-navy-600'
            : dragging ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10 cursor-pointer'
            : 'border-slate-300 dark:border-navy-500 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.webm,.avi,.mov,.mp3,.wav,.ogg,.m4a"
          className="hidden"
          onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
        />
        <Upload size={20} className="mx-auto text-slate-400 mb-1" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {full ? 'Límite de archivos alcanzado' : 'Clic o arrastra archivos aquí'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Máx. {MAX_FILES} archivos · 10 MB c/u
        </p>
        <p className="text-xs text-slate-400">
          Word, Excel, PPT, PDF, Imagen, Video, Audio
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, i) => {
            const { Icon, color } = getFileIcon(f.name);
            return (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-navy-800 rounded-lg border border-slate-200 dark:border-navy-600">
                <Icon size={16} className={color} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-navy-600 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                >
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
