import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Plus, Type, AlignLeft, Hash, Calendar, CircleDot, CheckSquare, Paperclip, PenLine } from 'lucide-react';
import { Button } from '../common/Button';
import { CampoEditorModal } from './CampoEditorModal';

const TIPO_ICONS = {
  texto_corto: Type,
  texto_largo: AlignLeft,
  numero: Hash,
  fecha: Calendar,
  seleccion_unica: CircleDot,
  seleccion_multiple: CheckSquare,
  archivo: Paperclip,
  firma: PenLine,
};

function TipoIcon({ tipo }) {
  const Icon = TIPO_ICONS[tipo] || Type;
  return <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />;
}

function SortableCampo({ campo, index, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: campo._key || campo.id || campo.etiqueta });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-800"
    >
      <button {...attributes} {...listeners} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing">
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
          onClick={() => onEdit(index)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-500 dark:text-slate-400"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(index)}
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-slate-400 hover:text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function CamposList({ campos = [], onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Each campo needs a stable key for dnd-kit
  const camposConKey = campos.map((c, i) => ({ ...c, _key: c.id || `campo-${i}` }));

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIdx = camposConKey.findIndex((c) => c._key === active.id);
    const newIdx = camposConKey.findIndex((c) => c._key === over.id);
    onChange(arrayMove(campos, oldIdx, newIdx));
  }

  function handleSave(data) {
    if (editando !== null) {
      onChange(campos.map((c, i) => (i === editando ? { ...c, ...data } : c)));
    } else {
      onChange([...campos, data]);
    }
    setEditando(null);
  }

  function handleEdit(index) {
    setEditando(index);
    setShowModal(true);
  }

  function handleDelete(index) {
    onChange(campos.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={camposConKey.map((c) => c._key)} strategy={verticalListSortingStrategy}>
          {camposConKey.map((campo, i) => (
            <SortableCampo
              key={campo._key}
              campo={campo}
              index={i}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </SortableContext>
      </DndContext>

      {campos.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-lg">
          Aún no hay campos. Agrega el primero.
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => { setEditando(null); setShowModal(true); }}
        className="gap-2 self-start"
      >
        <Plus className="w-4 h-4" />
        Agregar campo
      </Button>

      <CampoEditorModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditando(null); }}
        onSave={handleSave}
        campoInicial={editando !== null ? campos[editando] : null}
      />
    </div>
  );
}
