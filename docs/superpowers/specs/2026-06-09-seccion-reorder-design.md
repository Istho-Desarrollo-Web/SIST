# Reordenamiento de secciones en el Form Builder

**Goal:** Permitir que el admin reorganice el orden de las secciones del formulario mediante drag-and-drop y botones ↑ ↓ en el encabezado de cada sección.

**Architecture:** Se extiende el `DndContext` existente en `CamposList.jsx` — ya maneja arrastre de campos con `@dnd-kit`. Las secciones se envuelven en su propio `SortableContext`; el `handleDragEnd` existente se amplía para detectar si el elemento activo es una sección (prefijo `sec-`) y aplicar `arrayMove` sobre el array de secciones. Los botones ↑/↓ son handlers síncronos sin DnD.

**Tech Stack:** React 19, @dnd-kit/core, @dnd-kit/sortable, Lucide React (GripVertical, ChevronUp, ChevronDown)

---

## Modelo de datos

Sin cambios. El campo `orden` de cada sección ya existe y se recalcula por índice al guardar en `guardarCampos` del backend. Solo cambia el orden del array en memoria.

---

## Cambios en `CamposList.jsx`

### SortableContext para secciones

Envolver el bloque `secciones.map(...)` en:

```jsx
<SortableContext items={secciones.map(s => s._key)} strategy={verticalListSortingStrategy}>
  {secciones.map((seccion, idx) => (
    <SeccionItem
      key={seccion._key}
      seccion={seccion}
      ...props existentes...
      onMoverArriba={idx > 0 ? () => handleMoverSeccion(seccion._key, -1) : null}
      onMoverAbajo={idx < secciones.length - 1 ? () => handleMoverSeccion(seccion._key, 1) : null}
    >
      ...
    </SeccionItem>
  ))}
</SortableContext>
```

### `handleMoverSeccion(key, delta)`

```js
function handleMoverSeccion(key, delta) {
  const idx = secciones.findIndex(s => s._key === key);
  if (idx < 0) return;
  onChangeSecciones(arrayMove(secciones, idx, idx + delta));
}
```

### Ampliar `handleDragEnd`

Al inicio de la función, antes de la lógica de campos:

```js
function handleDragEnd({ active, over }) {
  setActiveId(null);
  if (!over || active.id === over.id) return;

  // Sección arrastrándose sobre otra sección
  if (String(active.id).startsWith('sec-') && String(over.id).startsWith('sec-')) {
    const oldIdx = secciones.findIndex(s => s._key === active.id);
    const newIdx = secciones.findIndex(s => s._key === over.id);
    if (oldIdx !== -1 && newIdx !== -1) onChangeSecciones(arrayMove(secciones, oldIdx, newIdx));
    return;
  }

  // ... lógica de campos existente sin cambios ...
}
```

### `DragOverlay` — mostrar preview de sección

El `activeId` ya existe en el estado. Se detecta si es sección por prefijo:

```jsx
<DragOverlay dropAnimation={null}>
  {activeId?.startsWith('sec-')
    ? <SeccionOverlay seccion={secciones.find(s => s._key === activeId)} />
    : <CampoOverlay campo={activeCampo} />}
</DragOverlay>
```

### Componente `SeccionOverlay`

```jsx
function SeccionOverlay({ seccion }) {
  if (!seccion) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-700 shadow-2xl border-2 border-orange-400 opacity-90">
      <GripVertical className="w-4 h-4 text-white/60" />
      <span className="text-sm font-semibold text-white truncate">{seccion.nombre}</span>
    </div>
  );
}
```

---

## Cambios en `SeccionItem.jsx`

### Props nuevas

```
onMoverArriba: (() => void) | null   — null deshabilita el botón ↑ (primera sección)
onMoverAbajo:  (() => void) | null   — null deshabilita el botón ↓ (última sección)
```

### useSortable

```js
const {
  attributes,
  listeners,        // solo en el handle GripVertical
  setNodeRef,       // en el div wrapper externo
  transform,
  transition,
  isDragging,
} = useSortable({ id: seccion._key });

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0 : 1,
};
```

El `setNodeRef` de `useSortable` va en el `div` más externo del componente.
El `setNodeRef` de `useDroppable` (ya existente) sigue en el área interna de campos — sin conflicto.

### Handle y botones en el encabezado

En el `<div className="${headerBg} flex items-center gap-2 px-3 py-2">`, agregar a la izquierda del botón de colapso:

```jsx
{/* Handle de arrastre */}
<button
  type="button"
  {...attributes}
  {...listeners}
  className="text-white/40 hover:text-white/80 cursor-grab active:cursor-grabbing shrink-0 touch-none"
>
  <GripVertical className="w-4 h-4" />
</button>
```

Y antes del botón "Eliminar" en el encabezado, agregar los botones de flechas:

```jsx
{/* Mover arriba */}
<button
  type="button"
  title="Mover sección arriba"
  onClick={onMoverArriba ?? undefined}
  disabled={!onMoverArriba}
  className="text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
>
  <ChevronUp className="w-3.5 h-3.5" />
</button>

{/* Mover abajo */}
<button
  type="button"
  title="Mover sección abajo"
  onClick={onMoverAbajo ?? undefined}
  disabled={!onMoverAbajo}
  className="text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
>
  <ChevronDown className="w-3.5 h-3.5" />
</button>
```

### Wrapper externo sortable

```jsx
return (
  <div ref={setNodeRef} style={style} className={`rounded-lg border-2 ...`}>
    ...
  </div>
);
```

---

## Comportamiento

- Arrastrar por el handle `GripVertical` mueve la sección completa (con todos sus campos)
- Soltar sobre otra sección intercambia posiciones con `arrayMove`
- `↑` deshabilitado en la primera sección; `↓` deshabilitado en la última
- Los campos mantienen su `_seccionKey` — solo cambia el orden del array de secciones
- La sección arrastrada se vuelve transparente (`opacity: 0`) y el `DragOverlay` muestra el preview
- El `orden` se recalcula por índice en el backend al guardar (comportamiento ya existente)

---

## Notas de implementación

- `useSortable` y `useDroppable` coexisten porque aplican a elementos distintos: `useSortable` en el `div` externo, `useDroppable` en el `div` interno del área de campos
- Los campos `_key` empiezan con `"campo-"` y las secciones con `"sec-"`, lo que permite distinguirlos en `handleDragEnd` sin estado adicional
- Importar `ChevronUp`, `ChevronDown` de lucide-react en `SeccionItem.jsx` (ya tiene otros iconos de lucide)
