import { CheckCircle, Download, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function PDFSuccessModal({ isOpen, onClose, pdfUrl, formularioNombre }) {
  function descargar() {
    if (pdfUrl) window.open(pdfUrl, '_blank');
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="">
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="w-16 h-16 rounded-full bg-cgreen-100 dark:bg-cgreen-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-cgreen-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            ¡Formulario enviado con éxito!
          </h3>
          {formularioNombre && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {formularioNombre}
            </p>
          )}
        </div>
        {pdfUrl ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tu PDF fue generado y está listo para descargar.
          </p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tu respuesta fue registrada exitosamente.
          </p>
        )}
        <div className="flex gap-3 w-full">
          {pdfUrl && (
            <Button onClick={descargar} className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Descargar PDF
            </Button>
          )}
          <Button variant={pdfUrl ? 'outline' : 'primary'} onClick={onClose} className="flex-1">
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
