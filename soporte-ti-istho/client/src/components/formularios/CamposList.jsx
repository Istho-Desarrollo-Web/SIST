import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Pencil, Trash2, Plus, FolderPlus,
  Type, AlignLeft, Hash, Calendar, CircleDot, CheckSquare, Paperclip, PenLine, LayoutGrid,
} from 'lucide-react';
import { Button } from '../common/Button';
import { CampoEditorModal } from './CampoEditorModal';
import { SeccionItem } from './SeccionItem';

const TIPO_ICONS = {
  texto_corto: Type,
  texto_largo: AlignLeft,
  numero: Hash,
  fecha: Calendar,
  seleccion_unica: CircleDot,
  seleccion_multiple: CheckSquare,
  archivo: Paperclip,
  firma: PenLine,
  grilla: LayoutGrid,
};

function TipoIcon({ tipo }) {
  const Icon = TIPO_ICONS[tipo] || Type;
  return <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />;
}

function SortableCampo({ campo, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: campo._key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-800"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <TipoIcon tipo={campo.tipo} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{campo.etiqueta}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{campo.tipo?.replace('_', ' ')}</p>
      </div>
      {campo.requerido && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
          Requerido
        </span>
      )}
      <div className="flex gap-1">
        <button
          onClick={() => onEdit(campo._key)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-500 dark:text-slate-400"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(campo._key)}
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-slate-400 hover:text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function CampoOverlay({ campo }) {
  if (!campo) return null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-orange-400 bg-white dark:bg-navy-800 shadow-lg opacity-90">
      <GripVertical className="w-4 h-4 text-orange-400" />
      <TipoIcon tipo={campo.tipo} />
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{campo.etiqueta}</span>
    </div>
  );
}

function UnsectionedBucket({ campos, onEditCampo, onDeleteCampo }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'droppable-unsectioned' });
  if (campos.length === 0) return null;
  return (
    <div
      className={`rounded-lg border-2 border-dashed p-2 transition-colors ${isOver ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-300 dark:border-navy-500 bg-slate-50 dark:bg-navy-900/50'}`}
    >
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">
        Sin sección
      </p>
      <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[20px]">
        <SortableContext items={campos.map(c => c._key)} strategy={verticalListSortingStrategy}>
          {campos.map(campo => (
            <SortableCampo
              key={campo._key}
              campo={campo}
              onEdit={onEditCampo}
              onDelete={onDeleteCampo}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function CamposList({ campos = [], onChange, secciones = [], onChangeSecciones }) {
  const [showModal, setShowModal] = useState(false);
  const [editandoKey, setEditandoKey] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Agrupación de campos por sección
  const camposBySec = {};
  secciones.forEach(s => { camposBySec[s._key] = []; });
  camposBySec.__unsectioned = [];
  campos.forEach(c => {
    const k = c._seccionKey;
    if (k && camposBySec[k]) camposBySec[k].push(c);
    else camposBySec.__unsectioned.push(c);
  });

  const activeCampo = activeId ? campos.find(c => c._key === activeId) : null;

  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const fromCampo = campos.find(c => c._key === active.id);
    if (!fromCampo) return;

    const overId = String(over.id);

    // Dropped on a container droppable (empty section or unsectioned)
    if (overId.startsWith('droppable-')) {
      const containerKey = overId.replace('droppable-', '');
      const newSeccionKey = containerKey === 'unsectioned' ? null : containerKey;
      if (fromCampo._seccionKey !== newSeccionKey) {
        onChange(campos.map(c => c._key === active.id ? { ...c, _seccionKey: newSeccionKey } : c));
      }
      return;
    }

    // Dropped on another campo
    const toCampo = campos.find(c => c._key === over.id);
    if (!toCampo) return;

    if (fromCampo._seccionKey === toCampo._seccionKey) {
      // Same container: reorder
      const oldIdx = campos.findIndex(c => c._key === active.id);
      const newIdx = campos.findIndex(c => c._key === over.id);
      onChange(arrayMove(campos, oldIdx, newIdx));
    } else {
      // Different container: move to target section, insert at target position
      const movedCampo = { ...fromCampo, _seccionKey: toCampo._seccionKey };
      const withoutActive = campos.filter(c => c._key !== active.id);
      const targetIdx = withoutActive.findIndex(c => c._key === over.id);
      const next = [...withoutActive];
      next.splice(targetIdx, 0, movedCampo);
      onChange(next);
    }
  }

  function handleSaveCampo(data) {
    if (editandoKey !== null) {
      onChange(campos.map(c => c._key === editandoKey ? { ...c, ...data } : c));
    } else {
      onChange([...campos, { ...data, _key: `campo-${Date.now()}`, _seccionKey: null }]);
    }
    setEditandoKey(null);
  }

  function handleEditCampo(key) {
    setEditandoKey(key);
    setShowModal(true);
  }

  function handleDeleteCampo(key) {
    onChange(campos.filter(c => c._key !== key));
  }

  function handleAgregarSeccion() {
    const nueva = {
      _key: `sec-${Date.now()}`,
      id: null,
      nombre: 'Nueva sección',
      orden: secciones.length,
      visibleParaUsuario: false,
    };
    onChangeSecciones([...secciones, nueva]);
  }

  function handleRenombrarSeccion(key, nombre) {
    onChangeSecciones(secciones.map(s => s._key === key ? { ...s, nombre } : s));
  }

  function handleToggleVisible(key) {
    onChangeSecciones(secciones.map(s =>
      s._key === key ? { ...s, visibleParaUsuario: !s.visibleParaUsuario } : s
    ));
  }

  function handleEliminarSeccion(key) {
    // Campos de esa sección pasan a sin sección
    onChange(campos.map(c => c._seccionKey === key ? { ...c, _seccionKey: null } : c));
    onChangeSecciones(secciones.filter(s => s._key !== key));
  }

  function handleActualizarCondicionesSeccion(key, condiciones) {
    onChangeSecciones(secciones.map(s =>
      s._key === key ? { ...s, condiciones: condiciones || null } : s
    ));
  }

  const editandoCampo = editandoKey !== null ? campos.find(c => c._key === editandoKey) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={() => { setEditandoKey(null); setShowModal(true); }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar campo
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleAgregarSeccion}
          className="gap-2 border-navy-600 text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800"
        >
          <FolderPlus className="w-4 h-4" />
          Agregar sección
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Secciones */}
        {secciones.map(seccion => (
          <SeccionItem
            key={seccion._key}
            seccion={seccion}
            campos={camposBySec[seccion._key] || []}
            onRenombrar={handleRenombrarSeccion}
            onToggleVisible={handleToggleVisible}
            onEliminar={handleEliminarSeccion}
            onActualizarCondiciones={handleActualizarCondicionesSeccion}
            camposDelFormulario={campos.filter(c => c.id)}
          >
            {(camposBySec[seccion._key] || []).map(campo => (
              <SortableCampo
                key={campo._key}
                campo={campo}
                onEdit={handleEditCampo}
                onDelete={handleDeleteCampo}
              />
            ))}
          </SeccionItem>
        ))}

        {/* Sin sección */}
        <UnsectionedBucket
          campos={camposBySec.__unsectioned}
          onEditCampo={handleEditCampo}
          onDeleteCampo={handleDeleteCampo}
        />

        {/* Estado vacío total */}
        {campos.length === 0 && secciones.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-lg">
            Aún no hay campos ni secciones. Agrega el primero.
          </div>
        )}

        <DragOverlay dropAnimation={null}>
          <CampoOverlay campo={activeCampo} />
        </DragOverlay>
      </DndContext>

      <CampoEditorModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditandoKey(null); }}
        onSave={handleSaveCampo}
        campoInicial={editandoCampo || null}
        camposDelFormulario={campos.filter(c => c.id && c._key !== editandoKey)}
      />
    </div>
  );
}
