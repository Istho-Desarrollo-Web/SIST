import { useState, useRef, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { X, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Button } from '../common/Button';
import { Select } from '../common/Select';

// Draggable chip (campo no mapeado)
function DraggableChip({ campo }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(campo.id || campo.etiqueta) });
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

// Droppable canvas overlay
function CanvasOverlay({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pdf-canvas-overlay' });
  return (
    <div
      ref={setNodeRef}
      className={`absolute inset-0 ${isOver ? 'bg-orange-500/10' : ''}`}
      onDragOver={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}

export function PDFMapper({ campos = [], plantilla, mapeoInicial = [], onSave, camposPDF = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [mapeos, setMapeos] = useState(mapeoInicial);
  const [loading, setLoading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Load PDF
  useEffect(() => {
    if (!plantilla?.urlCloudinary) return;
    setLoading(true);
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

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    pdfDoc.getPage(pageNum).then((page) => {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      page.render({ canvasContext: canvas.getContext('2d'), viewport });
    });
  }, [pdfDoc, pageNum]);

  // Campos ya mapeados
  const mapeadosIds = new Set(mapeos.map((m) => String(m.campoId)));
  const camposNoMapeados = campos.filter((c) => !mapeadosIds.has(String(c.id)));
  const mapeosEnPagina = mapeos.filter((m) => m.pagina === pageNum);

  function handleDragEnd({ active, over }) {
    if (!over || over.id !== 'pdf-canvas-overlay') return;
    const container = containerRef.current;
    if (!container) return;
    const translated = active.rect.current?.translated;
    if (!translated) return;
    const containerRect = container.getBoundingClientRect();
    const posX = ((translated.left - containerRect.left + translated.width / 2) / containerRect.width) * 100;
    const posY = ((translated.top - containerRect.top + translated.height / 2) / containerRect.height) * 100;
    const campoId = active.id;
    const campo = campos.find((c) => String(c.id) === String(campoId));
    if (!campo) return;
    setMapeos((prev) => [
      ...prev,
      {
        campoId: campo.id,
        etiqueta: campo.etiqueta,
        pagina: pageNum,
        posX: Math.max(0, Math.min(100, posX)),
        posY: Math.max(0, Math.min(100, posY)),
        ancho: 15,
        pdfCampoNombre: '',
      },
    ]);
  }

  function removeMapeo(campoId) {
    setMapeos((prev) => prev.filter((m) => String(m.campoId) !== String(campoId)));
  }

  function updatePdfCampoNombre(campoId, nombre) {
    setMapeos((prev) =>
      prev.map((m) => String(m.campoId) === String(campoId) ? { ...m, pdfCampoNombre: nombre } : m)
    );
  }

  if (!plantilla) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-slate-200 dark:border-navy-600 text-sm text-slate-400 dark:text-slate-500">
        Sube una plantilla PDF para activar el mapeo
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full">
        {/* Left panel — unmapped fields */}
        <div className="w-52 shrink-0 flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Campos por mapear</p>
          {camposNoMapeados.length === 0
            ? <p className="text-xs text-slate-400 dark:text-slate-500 italic">Todos mapeados</p>
            : camposNoMapeados.map((c) => <DraggableChip key={c.id} campo={c} />)
          }
        </div>

        {/* Right panel — PDF canvas */}
        <div className="flex-1 flex flex-col gap-3">
          {loading && (
            <div className="flex items-center justify-center h-64 text-sm text-slate-400">Cargando PDF...</div>
          )}
          <div className="relative overflow-auto border border-slate-200 dark:border-navy-600 rounded-lg bg-slate-50 dark:bg-navy-900" style={{ maxHeight: '60vh' }}>
            <div ref={containerRef} className="relative inline-block">
              <canvas ref={canvasRef} className="block" />
              <CanvasOverlay>
                {/* Positioned chips for current page */}
                {mapeosEnPagina.map((m) => (
                  <div
                    key={m.campoId}
                    style={{ position: 'absolute', left: `${m.posX}%`, top: `${m.posY}%`, transform: 'translate(-50%,-50%)' }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-orange-500 text-white text-xs shadow-md z-10 whitespace-nowrap"
                  >
                    {m.etiqueta}
                    <button onClick={() => removeMapeo(m.campoId)} className="ml-1 hover:text-orange-200">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </CanvasOverlay>
            </div>
          </div>

          {/* Paginador */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-center text-sm">
              <button
                onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                disabled={pageNum === 1}
                className="disabled:opacity-40 hover:text-orange-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-slate-600 dark:text-slate-400">Página {pageNum} de {totalPages}</span>
              <button
                onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))}
                disabled={pageNum === totalPages}
                className="disabled:opacity-40 hover:text-orange-500 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* AcroForm campo names */}
          {plantilla.tieneAcroform && mapeos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Campos AcroForm</p>
              {mapeos.map((m) => (
                <div key={m.campoId} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-300 w-32 truncate">{m.etiqueta}</span>
                  <Select
                    value={m.pdfCampoNombre || ''}
                    onChange={(v) => updatePdfCampoNombre(m.campoId, v)}
                    options={camposPDF.map((n) => ({ value: n, label: n }))}
                    placeholder="Campo PDF..."
                  />
                </div>
              ))}
            </div>
          )}

          <Button onClick={() => onSave(mapeos)} className="gap-2 self-end">
            <Save className="w-4 h-4" />
            Guardar mapeo
          </Button>
        </div>
      </div>
    </DndContext>
  );
}
