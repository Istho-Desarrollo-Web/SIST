import { useState, useRef, useEffect } from 'react';
import {
  DndContext, DragOverlay,
  useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { X, ChevronLeft, ChevronRight, Save, Bold, Italic } from 'lucide-react';
import { Button } from '../common/Button';
import { Select } from '../common/Select';

function genKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function SidebarChip({ campo }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `sidebar-${campo.id}` });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="px-3 py-2 rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-sm text-orange-700 dark:text-orange-300 cursor-grab active:cursor-grabbing select-none"
    >
      {campo.etiqueta}
    </div>
  );
}

function DragChipOverlay({ label }) {
  return (
    <div className="px-2 py-1 rounded bg-orange-500 text-white text-xs shadow-lg whitespace-nowrap opacity-90 cursor-grabbing">
      {label}
    </div>
  );
}

function PlacedChip({ mapeo, containerRef, onRemove, onMove, onResize, isSelected, onSelect }) {
  const movingRef = useRef(false);
  const resizingRef = useRef(false);
  const resizeStartRef = useRef(null);

  const ancho = mapeo.ancho || 15;
  const alto = mapeo.alto || 5;

  function handleMoveDown(e) {
    if (e.target.closest('[data-resize]') || e.target.closest('button')) return;
    e.preventDefault();
    movingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(mapeo._key);
  }

  function handleMoveMove(e) {
    if (!movingRef.current || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    onMove(
      mapeo._key,
      Math.max(2, Math.min(98, ((e.clientX - cr.left) / cr.width) * 100)),
      Math.max(2, Math.min(98, ((e.clientY - cr.top) / cr.height) * 100)),
    );
  }

  function handleMoveUp() {
    movingRef.current = false;
  }

  function handleResizeDown(e) {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    resizeStartRef.current = { x: e.clientX, y: e.clientY, ancho, alto };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleResizeMove(e) {
    if (!resizingRef.current || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - resizeStartRef.current.x) / cr.width) * 100;
    const dy = ((e.clientY - resizeStartRef.current.y) / cr.height) * 100;
    onResize(
      mapeo._key,
      Math.max(3, Math.min(90, resizeStartRef.current.ancho + dx)),
      Math.max(2, Math.min(50, resizeStartRef.current.alto + dy)),
    );
  }

  function handleResizeUp() {
    resizingRef.current = false;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${mapeo.posX}%`,
        top: `${mapeo.posY}%`,
        width: `${ancho}%`,
        height: `${alto}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 20 : 10,
        touchAction: 'none',
        userSelect: 'none',
        boxSizing: 'border-box',
        cursor: 'move',
        minWidth: 40,
        minHeight: 16,
      }}
      onPointerDown={handleMoveDown}
      onPointerMove={handleMoveMove}
      onPointerUp={handleMoveUp}
      className={`flex items-center rounded border-2 ${
        isSelected
          ? 'border-orange-500 bg-orange-500/25'
          : 'border-orange-400/70 bg-orange-400/10 hover:bg-orange-400/20'
      }`}
    >
      <span
        className="px-1 text-orange-700 dark:text-orange-300 text-xs font-medium truncate flex-1 pointer-events-none select-none leading-tight"
        style={{ fontSize: 10 }}
      >
        {mapeo.etiqueta}
      </span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(mapeo._key); }}
        className="shrink-0 mr-0.5 text-orange-500 hover:text-red-500"
      >
        <X className="w-2.5 h-2.5" />
      </button>
      {/* Resize handle — corner inferior-derecho */}
      <div
        data-resize="true"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 10,
          height: 10,
          cursor: 'nwse-resize',
          touchAction: 'none',
          borderRadius: '2px 0 3px 0',
        }}
        className="bg-orange-500"
        onPointerDown={handleResizeDown}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
      />
    </div>
  );
}

function CanvasDropZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pdf-canvas' });
  return (
    <div ref={setNodeRef} className={`absolute inset-0 transition-colors ${isOver ? 'bg-orange-500/10' : ''}`}>
      {children}
    </div>
  );
}

function InspectorInput({ label, value, min, max, step, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 dark:text-slate-400">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 px-2 py-1 text-sm border border-slate-300 dark:border-navy-500 rounded bg-white dark:bg-navy-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
      />
    </div>
  );
}

export function PDFMapper({ campos = [], plantilla, mapeoInicial = [], onSave, camposPDF = [] }) {
  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const scrollRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeDragLabel, setActiveDragLabel] = useState(null);
  const [mapeos, setMapeos] = useState(() =>
    mapeoInicial.map((m) => ({
      ...m,
      _key: m._key || genKey(),
      etiqueta: m.etiqueta || campos.find((c) => String(c.id) === String(m.campoId))?.etiqueta || `Campo ${m.campoId}`,
    }))
  );
  const [selectedKey, setSelectedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setMapeos(
      mapeoInicial.map((m) => ({
        ...m,
        _key: m._key || genKey(),
        etiqueta: m.etiqueta || campos.find((c) => String(c.id) === String(m.campoId))?.etiqueta || `Campo ${m.campoId}`,
      }))
    );
    setSelectedKey(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapeoInicial]);

  useEffect(() => {
    if (!plantilla?.urlCloudinary) return;
    setLoading(true);
    setPdfDoc(null);
    setPageNum(1);
    import('pdfjs-dist').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      pdfjsLib.getDocument(plantilla.urlCloudinary).promise.then((doc) => {
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setLoading(false);
      });
    });
  }, [plantilla]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !canvasWrapRef.current) return;
    let cancelled = false;
    pdfDoc.getPage(pageNum).then((page) => {
      if (cancelled) return;
      const availableWidth = canvasWrapRef.current.clientWidth || 600;
      const native = page.getViewport({ scale: 1 });
      const scale = availableWidth / native.width;
      const vp = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
      task.promise.catch(() => {});
    });
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pageNum]);

  // Comparación robusta: Number() maneja posibles strings desde la BD
  const mapeosEnPagina = mapeos.filter((m) => Number(m.pagina) === Number(pageNum));

  function calcDropPos(activeRect) {
    const translated = activeRect?.translated;
    if (!translated || !canvasWrapRef.current) return null;
    const cr = canvasWrapRef.current.getBoundingClientRect();
    return {
      posX: Math.max(2, Math.min(98, ((translated.left - cr.left + translated.width / 2) / cr.width) * 100)),
      posY: Math.max(2, Math.min(98, ((translated.top - cr.top + translated.height / 2) / cr.height) * 100)),
    };
  }

  function handleDragStart({ active }) {
    const id = String(active.id);
    if (id.startsWith('sidebar-')) {
      const campo = campos.find((c) => String(c.id) === id.slice('sidebar-'.length));
      if (campo) setActiveDragLabel(campo.etiqueta);
    }
  }

  function handleDragEnd({ active, over }) {
    setActiveDragLabel(null);
    if (!over || over.id !== 'pdf-canvas') return;
    const id = String(active.id);
    if (!id.startsWith('sidebar-')) return;
    const pos = calcDropPos(active.rect.current);
    if (!pos) return;
    const campo = campos.find((c) => String(c.id) === id.slice('sidebar-'.length));
    if (!campo) return;
    const newKey = genKey();
    setMapeos((prev) => [
      ...prev,
      {
        _key: newKey,
        campoId: campo.id,
        etiqueta: campo.etiqueta,
        pagina: pageNum,
        ...pos,
        ancho: 20,
        alto: 5,
        fontTamano: 10,
        fontFamilia: 'Helvetica',
        fontNegrita: false,
        fontCursiva: false,
        fontColor: '#000000',
        pdfCampoNombre: '',
      },
    ]);
    setSelectedKey(newKey);
  }

  function handleChipMove(key, posX, posY) {
    setMapeos((prev) => prev.map((m) => m._key === key ? { ...m, posX, posY } : m));
  }

  function handleChipResize(key, ancho, alto) {
    setMapeos((prev) => prev.map((m) => m._key === key ? { ...m, ancho, alto } : m));
  }

  function updateMapeo(key, updates) {
    setMapeos((prev) => prev.map((m) => m._key === key ? { ...m, ...updates } : m));
  }

  function removeMapeo(key) {
    setMapeos((prev) => prev.filter((m) => m._key !== key));
    if (selectedKey === key) setSelectedKey(null);
  }

  function updatePdfCampoNombre(key, nombre) {
    setMapeos((prev) => prev.map((m) => m._key === key ? { ...m, pdfCampoNombre: nombre } : m));
  }

  function handleSave() {
    onSave(mapeos.map(({ _key, etiqueta, ...rest }) => rest));
  }

  function handleCanvasAreaClick(e) {
    if (e.target === canvasWrapRef.current || e.target.tagName === 'CANVAS') {
      setSelectedKey(null);
    }
  }

  const selectedMapeo = selectedKey ? mapeos.find((m) => m._key === selectedKey) : null;
  const selectedCampo = selectedMapeo ? campos.find((c) => String(c.id) === String(selectedMapeo.campoId)) : null;

  if (!plantilla) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-slate-200 dark:border-navy-600 text-sm text-slate-400 dark:text-slate-500">
        Sube una plantilla PDF para activar el mapeo
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4 lg:flex-row">

        {/* Panel izquierdo — chips */}
        <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:w-48 lg:shrink-0">
          <p className="w-full text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
            Campos por mapear
          </p>
          <p className="w-full text-xs text-slate-400 dark:text-slate-500 hidden lg:block">
            Arrastra al PDF. Puedes usar el mismo campo varias veces.
          </p>
          {campos.length === 0
            ? <p className="text-xs text-slate-400 italic">Sin campos definidos</p>
            : campos.map((c) => <SidebarChip key={c.id} campo={c} />)
          }
        </div>

        {/* Panel derecho — visor PDF + inspector */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {loading && (
            <div className="flex items-center justify-center h-48 text-sm text-slate-400">
              Cargando PDF...
            </div>
          )}

          {/* Canvas PDF */}
          <div
            ref={scrollRef}
            className="overflow-y-auto overflow-x-hidden border border-slate-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900"
            style={{ maxHeight: '60vh' }}
          >
            <div
              ref={canvasWrapRef}
              className="relative w-full"
              onPointerDown={handleCanvasAreaClick}
            >
              <canvas ref={canvasRef} style={{ display: 'block' }} />
              <CanvasDropZone>
                {mapeosEnPagina.map((m) => (
                  <PlacedChip
                    key={m._key}
                    mapeo={m}
                    containerRef={canvasWrapRef}
                    isSelected={selectedKey === m._key}
                    onSelect={setSelectedKey}
                    onRemove={removeMapeo}
                    onMove={handleChipMove}
                    onResize={handleChipResize}
                  />
                ))}
              </CanvasDropZone>
            </div>
          </div>

          {/* Inspector — visible cuando hay un chip seleccionado */}
          {selectedMapeo && (
            <div className="border border-orange-200 dark:border-orange-800/50 rounded-lg p-3 bg-orange-50/50 dark:bg-navy-800">
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3">
                Inspector: <span className="font-normal">{selectedMapeo.etiqueta}</span>
                <span className="ml-2 text-slate-400 dark:text-slate-500 font-normal">— Página {selectedMapeo.pagina}</span>
              </p>
              {/* Posición y tamaño */}
              <div className="flex flex-wrap gap-3 mb-4">
                {selectedCampo?.tipo === 'fecha' && (
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Parte de la fecha</label>
                    <Select
                      value={selectedMapeo.formatoFecha || 'completa'}
                      onChange={(v) => updateMapeo(selectedKey, { formatoFecha: v })}
                      options={[
                        { value: 'completa', label: 'Fecha completa' },
                        { value: 'dia', label: 'Día (número)' },
                        { value: 'mes', label: 'Mes (número)' },
                        { value: 'mes_nombre', label: 'Mes (nombre)' },
                        { value: 'anio', label: 'Año' },
                      ]}
                    />
                  </div>
                )}
                <InspectorInput
                  label="Ancho (%)"
                  value={Math.round((selectedMapeo.ancho || 15) * 10) / 10}
                  min={3} max={90} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { ancho: v })}
                />
                <InspectorInput
                  label="Alto (%)"
                  value={Math.round((selectedMapeo.alto || 5) * 10) / 10}
                  min={1} max={50} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { alto: v })}
                />
                <InspectorInput
                  label="Fuente (pt)"
                  value={selectedMapeo.fontTamano || 10}
                  min={6} max={36} step={1}
                  onChange={(v) => updateMapeo(selectedKey, { fontTamano: v })}
                />
                <InspectorInput
                  label="Pos X (%)"
                  value={Math.round((selectedMapeo.posX || 0) * 10) / 10}
                  min={0} max={98} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { posX: v })}
                />
                <InspectorInput
                  label="Pos Y (%)"
                  value={Math.round((selectedMapeo.posY || 0) * 10) / 10}
                  min={0} max={98} step={0.5}
                  onChange={(v) => updateMapeo(selectedKey, { posY: v })}
                />
              </div>

              {/* Separador */}
              <div className="border-t border-orange-200 dark:border-orange-800/40 mb-3" />

              {/* Tipografía */}
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Tipografía
              </p>

              {/* Fuente + Tamaño */}
              <div className="flex gap-2 mb-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Fuente</label>
                  <select
                    value={selectedMapeo.fontFamilia || 'Helvetica'}
                    onChange={e => updateMapeo(selectedKey, { fontFamilia: e.target.value })}
                    className="px-2 py-1 text-sm border border-slate-300 dark:border-navy-500 rounded bg-white dark:bg-navy-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="TimesRoman">Times New Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>
                <InspectorInput
                  label="PT"
                  value={selectedMapeo.fontTamano || 10}
                  min={6} max={72} step={1}
                  onChange={(v) => updateMapeo(selectedKey, { fontTamano: v })}
                />
              </div>

              {/* Negrita / Cursiva / Color */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  title="Negrita"
                  onClick={() => updateMapeo(selectedKey, { fontNegrita: !selectedMapeo.fontNegrita })}
                  className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${
                    selectedMapeo.fontNegrita
                      ? 'bg-navy-700 border-navy-700 text-white'
                      : 'bg-white dark:bg-navy-700 border-slate-300 dark:border-navy-500 text-slate-600 dark:text-slate-300 hover:border-navy-500'
                  }`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Cursiva"
                  onClick={() => updateMapeo(selectedKey, { fontCursiva: !selectedMapeo.fontCursiva })}
                  className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${
                    selectedMapeo.fontCursiva
                      ? 'bg-navy-700 border-navy-700 text-white'
                      : 'bg-white dark:bg-navy-700 border-slate-300 dark:border-navy-500 text-slate-600 dark:text-slate-300 hover:border-navy-500'
                  }`}
                >
                  <Italic className="w-4 h-4" />
                </button>
                <div className="flex-1" />
                <label className="text-xs text-slate-500 dark:text-slate-400">Color</label>
                <div className="relative">
                  <div
                    className="w-7 h-7 rounded border-2 border-slate-300 dark:border-navy-500 cursor-pointer"
                    style={{ backgroundColor: selectedMapeo.fontColor || '#000000' }}
                    onClick={() => document.getElementById(`color-input-${selectedKey}`)?.click()}
                  />
                  <input
                    id={`color-input-${selectedKey}`}
                    type="color"
                    value={selectedMapeo.fontColor || '#000000'}
                    onChange={e => updateMapeo(selectedKey, { fontColor: e.target.value })}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={selectedMapeo.fontColor || '#000000'}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                      updateMapeo(selectedKey, { fontColor: v });
                    }
                  }}
                  maxLength={7}
                  className="w-20 px-2 py-1 text-xs border border-slate-300 dark:border-navy-500 rounded bg-white dark:bg-navy-700 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              {/* Vista previa */}
              <div className="rounded border border-dashed border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-900 px-3 py-2 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Vista previa</p>
                <span
                  style={{
                    fontFamily: selectedMapeo.fontFamilia === 'TimesRoman'
                      ? 'serif'
                      : selectedMapeo.fontFamilia === 'Courier'
                        ? 'monospace'
                        : 'sans-serif',
                    fontWeight: selectedMapeo.fontNegrita ? 'bold' : 'normal',
                    fontStyle: selectedMapeo.fontCursiva ? 'italic' : 'normal',
                    color: selectedMapeo.fontColor || '#000000',
                    fontSize: `${Math.max(10, Math.min(24, selectedMapeo.fontTamano || 10))}px`,
                  }}
                >
                  Texto de ejemplo
                </span>
              </div>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-center text-sm select-none">
              <button
                onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                disabled={pageNum === 1}
                className="text-slate-500 dark:text-slate-300 disabled:opacity-40 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-slate-600 dark:text-slate-300">Página {pageNum} de {totalPages}</span>
              <button
                onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))}
                disabled={pageNum === totalPages}
                className="text-slate-500 dark:text-slate-300 disabled:opacity-40 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* AcroForm — mapeo de campos PDF */}
          {plantilla.tieneAcroform && mapeos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Campos AcroForm
              </p>
              {mapeos.map((m) => (
                <div key={m._key} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-300 w-32 truncate">{m.etiqueta}</span>
                  <Select
                    value={m.pdfCampoNombre || ''}
                    onChange={(v) => updatePdfCampoNombre(m._key, v)}
                    options={camposPDF.map((n) => ({ value: n, label: n }))}
                    placeholder="Campo PDF..."
                  />
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleSave} className="gap-2 self-end">
            <Save className="w-4 h-4" />
            Guardar mapeo
          </Button>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragLabel ? <DragChipOverlay label={activeDragLabel} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
