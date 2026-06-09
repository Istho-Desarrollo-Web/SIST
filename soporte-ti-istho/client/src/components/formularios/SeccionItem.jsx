import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Pencil, Trash2, Eye, EyeOff, Check, X, GitBranch, Plus } from 'lucide-react';
import { Select as SelectInput } from '../../common/Select';

function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
  }
  return [];
}

const TIPOS_TRIGGER_SEC = ['seleccion_unica', 'seleccion_multiple', 'texto_corto', 'numero'];

const OPERADORES_SEC = [
  { value: 'igual',         label: 'es igual a' },
  { value: 'diferente',     label: 'es diferente a' },
  { value: 'contiene',      label: 'contiene' },
  { value: 'no_contiene',   label: 'no contiene' },
  { value: 'esta_vacio',    label: 'está vacío' },
  { value: 'no_esta_vacio', label: 'no está vacío' },
];

function ReglaRowSeccion({ regla, camposDisponibles, onChange, onDelete }) {
  const campoSel = camposDisponibles.find(c => String(c.id) === String(regla.campoId));
  const opcionesValor = campoSel ? toArray(campoSel.opciones) : [];
  const mostrarValor = !['esta_vacio', 'no_esta_vacio'].includes(regla.operador);
  return (
    <div className="flex flex-wrap items-start gap-1 p-2 rounded bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
      <SelectInput
        value={String(regla.campoId || '')}
        onChange={v => onChange({ ...regla, campoId: v, valor: '' })}
        options={[{ value: '', label: 'Campo...' }, ...camposDisponibles.map(c => ({ value: String(c.id), label: c.etiqueta }))]}
        placeholder="Campo..."
      />
      <SelectInput
        value={regla.operador}
        onChange={v => onChange({ ...regla, operador: v })}
        options={OPERADORES_SEC.map(op => ({ value: op.value, label: op.label }))}
        placeholder="Operador..."
      />
      {mostrarValor && (
        opcionesValor.length > 0 ? (
          <SelectInput
            value={regla.valor || ''}
            onChange={v => onChange({ ...regla, valor: v })}
            options={[{ value: '', label: 'Valor...' }, ...opcionesValor.map(op => ({ value: op, label: op }))]}
            placeholder="Valor..."
          />
        ) : (
          <input
            type="text"
            value={regla.valor || ''}
            onChange={e => onChange({ ...regla, valor: e.target.value })}
            placeholder="Valor..."
            className="flex-1 min-w-[80px] text-xs rounded border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none"
          />
        )
      )}
      <button type="button" onClick={onDelete} className="text-slate-400 hover:text-red-500 p-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function SeccionItem({
  seccion,
  campos,
  onRenombrar,
  onToggleVisible,
  onEliminar,
  onActualizarCondiciones,
  camposDelFormulario = [],
  children,
}) {
  const [expandida, setExpandida] = useState(true);
  const [editando, setEditando] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(seccion.nombre);
  const [panelCondicionesVisible, setPanelCondicionesVisible] = useState(false);

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

        {/* Toggle condiciones */}
        <button
          type="button"
          title="Visibilidad condicional"
          onClick={() => setPanelCondicionesVisible(v => !v)}
          className={`shrink-0 ${seccion.condiciones ? 'text-amber-300 hover:text-amber-200' : 'text-white/60 hover:text-white'}`}
        >
          <GitBranch className="w-3.5 h-3.5" />
        </button>

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

      {/* Panel condiciones */}
      {panelCondicionesVisible && (() => {
        const condiciones = seccion.condiciones;
        const camposDisponibles = camposDelFormulario.filter(c =>
          c.id && TIPOS_TRIGGER_SEC.includes(c.tipo)
        );
        function setCondiciones(cond) {
          onActualizarCondiciones(seccion._key, cond);
        }
        return (
          <div className="p-3 flex flex-col gap-2 bg-slate-50 dark:bg-navy-850 border-b border-slate-200 dark:border-navy-600">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={!!condiciones}
                onChange={e => setCondiciones(
                  e.target.checked ? { operadorLogico: 'Y', reglas: [] } : null
                )}
                className="h-3.5 w-3.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              Activar visibilidad condicional
            </label>

            {condiciones && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">Mostrar si se cumplen</span>
                  <SelectInput
                    value={condiciones.operadorLogico}
                    onChange={v => setCondiciones({ ...condiciones, operadorLogico: v })}
                    options={[{ value: 'Y', label: 'TODAS las reglas' }, { value: 'O', label: 'ALGUNA regla' }]}
                    placeholder="Operador lógico..."
                  />
                  <span className="text-xs text-slate-500">siguientes reglas:</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {condiciones.reglas.map((regla, idx) => (
                    <ReglaRowSeccion
                      key={idx}
                      regla={regla}
                      camposDisponibles={camposDisponibles}
                      onChange={r => {
                        const reglas = [...condiciones.reglas];
                        reglas[idx] = r;
                        setCondiciones({ ...condiciones, reglas });
                      }}
                      onDelete={() => {
                        const reglas = condiciones.reglas.filter((_, i) => i !== idx);
                        setCondiciones({ ...condiciones, reglas });
                      }}
                    />
                  ))}
                </div>
                {condiciones.reglas.length < 10 && camposDisponibles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCondiciones({
                      ...condiciones,
                      reglas: [...condiciones.reglas, { campoId: '', operador: 'igual', valor: '' }],
                    })}
                    className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 self-start"
                  >
                    <Plus className="w-3 h-3" />
                    Agregar regla
                  </button>
                )}
              </>
            )}
          </div>
        );
      })()}

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
