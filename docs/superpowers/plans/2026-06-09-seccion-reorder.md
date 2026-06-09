# Reordenamiento de Secciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que el admin reorganice secciones del formulario mediante drag-and-drop (handle GripVertical) y botones ↑ ↓ en el encabezado de cada sección.

**Architecture:** Se extiende el `DndContext` único de `CamposList.jsx` envolviendo las secciones en su propio `SortableContext`. El `handleDragEnd` detecta si el elemento activo es una sección por prefijo `sec-` y aplica `arrayMove` sobre el array de secciones. `SeccionItem` se convierte en sortable con `useSortable` y recibe los callbacks de flechas desde `CamposList`.

**Tech Stack:** React 19, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, Lucide React

---

## Archivos modificados

- Modify: `soporte-ti-istho/client/src/components/formularios/CamposList.jsx`
- Modify: `soporte-ti-istho/client/src/components/formularios/SeccionItem.jsx`

---

## Task 1: Actualizar CamposList.jsx

**Files:**
- Modify: `soporte-ti-istho/client/src/components/formularios/CamposList.jsx`

Contexto: este archivo tiene un `DndContext` único que maneja el arrastre de campos. Las secciones se renderizan con `secciones.map(...)` sin ningún `SortableContext`. El estado `activeId` ya existe para el `DragOverlay` de campos. Los `_key` de secciones siempre empiezan con `"sec-"` y los de campos con `"campo-"`.

- [ ] **Step 1: Agregar el componente `SeccionOverlay`**

Agregar después de la función `CampoOverlay` (línea ~104), antes de `UnsectionedBucket`:

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

- [ ] **Step 2: Agregar `handleMoverSeccion` dentro del componente `CamposList`**

Agregar después de `handleActualizarCondicionesSeccion` (línea ~243), antes de `const editandoCampo`:

```js
function handleMoverSeccion(key, delta) {
  const idx = secciones.findIndex(s => s._key === key);
  if (idx < 0) return;
  onChangeSecciones(arrayMove(secciones, idx, idx + delta));
}
```

- [ ] **Step 3: Ampliar `handleDragEnd` para detectar arrastre de secciones**

Reemplazar la función `handleDragEnd` completa (líneas ~155-192) con:

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
    const oldIdx = campos.findIndex(c => c._key === active.id);
    const newIdx = campos.findIndex(c => c._key === over.id);
    onChange(arrayMove(campos, oldIdx, newIdx));
  } else {
    const movedCampo = { ...fromCampo, _seccionKey: toCampo._seccionKey };
    const withoutActive = campos.filter(c => c._key !== active.id);
    const targetIdx = withoutActive.findIndex(c => c._key === over.id);
    const next = [...withoutActive];
    next.splice(targetIdx, 0, movedCampo);
    onChange(next);
  }
}
```

- [ ] **Step 4: Envolver las secciones en un `SortableContext` y pasar props de flechas**

Reemplazar el bloque de renderizado de secciones dentro del `DndContext` (líneas ~278-298):

```jsx
{/* Secciones */}
<SortableContext items={secciones.map(s => s._key)} strategy={verticalListSortingStrategy}>
  {secciones.map((seccion, idx) => (
    <SeccionItem
      key={seccion._key}
      seccion={seccion}
      campos={camposBySec[seccion._key] || []}
      onRenombrar={handleRenombrarSeccion}
      onToggleVisible={handleToggleVisible}
      onEliminar={handleEliminarSeccion}
      onActualizarCondiciones={handleActualizarCondicionesSeccion}
      camposDelFormulario={campos.filter(c => c.id)}
      onMoverArriba={idx > 0 ? () => handleMoverSeccion(seccion._key, -1) : null}
      onMoverAbajo={idx < secciones.length - 1 ? () => handleMoverSeccion(seccion._key, 1) : null}
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
</SortableContext>
```

- [ ] **Step 5: Actualizar `DragOverlay` para mostrar preview de sección**

Reemplazar el bloque `<DragOverlay>` (líneas ~314-316):

```jsx
<DragOverlay dropAnimation={null}>
  {activeId?.startsWith('sec-')
    ? <SeccionOverlay seccion={secciones.find(s => s._key === activeId)} />
    : <CampoOverlay campo={activeCampo} />}
</DragOverlay>
```

- [ ] **Step 6: Verificar en el navegador**

Con `npm run dev` corriendo en `soporte-ti-istho/client/`:
1. Abrir el builder de un formulario con al menos 2 secciones
2. Verificar que la lista de secciones se renderiza correctamente (sin errores en consola)
3. El DnD de campos sigue funcionando igual que antes

- [ ] **Step 7: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/CamposList.jsx
git commit -m "feat: agregar SortableContext y handleMoverSeccion para reordenar secciones"
```

---

## Task 2: Actualizar SeccionItem.jsx

**Files:**
- Modify: `soporte-ti-istho/client/src/components/formularios/SeccionItem.jsx`

Contexto: el componente ya usa `useDroppable` de `@dnd-kit/core` para el área interna donde se sueltan campos. Vamos a agregar `useSortable` de `@dnd-kit/sortable` en el div externo — son refs distintos aplicados a elementos distintos, sin conflicto. Los iconos de Lucide ya están importados; hay que agregar `ChevronUp`, `ChevronDown` y `GripVertical`.

- [ ] **Step 1: Agregar imports nuevos**

Reemplazar la línea de imports de lucide-react y agregar imports de dnd-kit:

```js
import { ChevronDown, ChevronRight, ChevronUp, GripVertical, Pencil, Trash2, Eye, EyeOff, Check, X, GitBranch, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

- [ ] **Step 2: Agregar las nuevas props al componente**

Reemplazar la firma de `SeccionItem`:

```js
export function SeccionItem({
  seccion,
  campos,
  onRenombrar,
  onToggleVisible,
  onEliminar,
  onActualizarCondiciones,
  camposDelFormulario = [],
  onMoverArriba = null,
  onMoverAbajo = null,
  children,
}) {
```

- [ ] **Step 3: Agregar el hook `useSortable` dentro del componente**

Agregar después de los `useState` existentes (líneas ~79-82), antes de `const { setNodeRef, isOver } = useDroppable(...)`:

```js
const {
  attributes,
  listeners,
  setNodeRef: setSortableRef,
  transform,
  transition,
  isDragging,
} = useSortable({ id: seccion._key });

const sortableStyle = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0 : 1,
};
```

- [ ] **Step 4: Aplicar `setSortableRef` y `sortableStyle` al div externo**

Reemplazar la apertura del div raíz (línea ~109):

```jsx
<div
  ref={setSortableRef}
  style={sortableStyle}
  className={`rounded-lg border-2 overflow-hidden ${seccion.visibleParaUsuario ? 'border-navy-700' : 'border-slate-400'}`}
>
```

- [ ] **Step 5: Agregar el handle de arrastre en el encabezado**

En el `<div className="${headerBg} flex items-center gap-2 px-3 py-2">`, agregar como **primer hijo** (antes del botón de colapso):

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

- [ ] **Step 6: Agregar botones ↑ ↓ antes del botón Eliminar**

En el encabezado, agregar los botones de flechas **inmediatamente antes** del botón Eliminar (el que tiene `<Trash2>`):

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

- [ ] **Step 7: Verificar en el navegador**

Con `npm run dev` corriendo:
1. Abrir el builder con al menos 2 secciones
2. Verificar que aparece el handle `GripVertical` a la izquierda del encabezado de cada sección
3. Verificar que aparecen los botones ↑ ↓ en cada sección
4. El botón ↑ de la primera sección debe aparecer deshabilitado (opaco)
5. El botón ↓ de la última sección debe aparecer deshabilitado (opaco)
6. Hacer clic en ↓ en la primera sección: debe bajar al segundo lugar
7. Hacer clic en ↑ en la última sección: debe subir al penúltimo lugar
8. Arrastrar una sección por el handle: debe moverse con preview naranja y la sección original transparente
9. Soltar sobre otra sección: deben intercambiar posiciones
10. Verificar que los campos dentro de cada sección se mantienen asociados a su sección correcta tras el reordenamiento
11. Guardar el formulario y recargar: el nuevo orden debe persistir

- [ ] **Step 8: Commit**

```bash
git add soporte-ti-istho/client/src/components/formularios/SeccionItem.jsx
git commit -m "feat: hacer SeccionItem sortable con handle drag y botones arriba/abajo"
```
