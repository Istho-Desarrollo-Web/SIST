import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Pencil, Trash2, Eye, EyeOff, Check, X } from 'lucide-react';

export function SeccionItem({
  seccion,
  campos,
  onRenombrar,
  onToggleVisible,
  onEliminar,
  children,
}) {
  const [expandida, setExpandida] = useState(true);
  const [editando, setEditando] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(seccion.nombre);

  const { setNodeRef, isOver } = useDroppable({ id: `droppable-${seccion._key}` });

  const itemKeys = campos.map(c => c._key);

  function confirmarRenombrar() {
    const nombre = nombreDraft.trim();
    if (nombre) onRenombrar(seccion._key, nombre);
    setEditando(false);
  }

  function cancelarRenombrar() {
    setNombreDraft(seccion.nombre);
    setEditando(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') confirmarRenombrar();
    if (e.key === 'Escape') cancelarRenombrar();
  }

  const headerBg = seccion.visibleParaUsuario
    ? 'bg-navy-700 border-navy-700'
    : 'bg-slate-500 border-slate-400';

  return (
    <div className={`rounded-lg border-2 overflow-hidden ${seccion.visibleParaUsuario ? 'border-navy-700' : 'border-slate-400'}`}>
      {/* Encabezado */}
      <div className={`${headerBg} flex items-center gap-2 px-3 py-2`}>
        {/* Colapsar */}
        <button
          type="button"
          onClick={() => setExpandida(e => !e)}
          className="text-white/70 hover:text-white shrink-0"
        >
          {expandida
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Nombre editable */}
        {editando ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={nombreDraft}
              onChange={e => setNombreDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 px-2 py-0.5 rounded text-sm text-slate-800 bg-white focus:outline-none"
            />
            <button type="button" onClick={confirmarRenombrar} className="text-white/80 hover:text-white">
              <Check className="w-4 h-4" />
            </button>
            <button type="button" onClick={cancelarRenombrar} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="flex-1 text-sm font-semibold text-white truncate">
            {seccion.nombre}
          </span>
        )}

        {/* Toggle visibleParaUsuario */}
        <button
          type="button"
          title={seccion.visibleParaUsuario ? 'Visible para usuario (click para ocultar)' : 'Oculta para usuario (click para mostrar)'}
          onClick={() => onToggleVisible(seccion._key)}
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 bg-white/10 hover:bg-white/20 transition-colors shrink-0"
        >
          <div
            className={`w-6 h-3.5 rounded-full relative transition-colors ${seccion.visibleParaUsuario ? 'bg-cgreen-500' : 'bg-slate-400'}`}
          >
            <div
              className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${seccion.visibleParaUsuario ? 'right-0.5' : 'left-0.5'}`}
            />
          </div>
          {seccion.visibleParaUsuario
            ? <Eye className="w-3 h-3 text-white/80" />
            : <EyeOff className="w-3 h-3 text-white/60" />}
        </button>

        {/* Renombrar */}
        {!editando && (
          <button
            type="button"
            onClick={() => { setNombreDraft(seccion.nombre); setEditando(true); }}
            className="text-white/60 hover:text-white shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Eliminar */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`¿Eliminar la sección "${seccion.nombre}"? Los campos quedarán sin sección.`)) {
              onEliminar(seccion._key);
            }
          }}
          className="text-white/60 hover:text-red-300 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cuerpo — campos */}
      {expandida && (
        <div
          ref={setNodeRef}
          className={`p-2 flex flex-col gap-2 min-h-[40px] bg-slate-50 dark:bg-navy-900 transition-colors ${isOver ? 'bg-navy-100 dark:bg-navy-800' : ''}`}
        >
          <SortableContext items={itemKeys} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
          {campos.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2 italic">
              Arrastra campos aquí
            </p>
          )}
        </div>
      )}
    </div>
  );
}
