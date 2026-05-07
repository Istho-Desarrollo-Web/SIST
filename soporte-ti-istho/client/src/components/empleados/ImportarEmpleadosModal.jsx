import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, X, CheckCircle, AlertCircle, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import api from '../../services/api';

export function ImportarEmpleadosModal({ open, onClose, onImportado }) {
  const [archivo, setArchivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);

  const reset = () => {
    setArchivo(null);
    setResultado(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.xlsx?$/i)) {
      toast.error('Solo se permiten archivos .xlsx');
      return;
    }
    setArchivo(f);
    setResultado(null);
  };

  const importar = async () => {
    if (!archivo) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const res = await api.post('/empleados/importar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(res.data.data);
      if (res.data.data.creados > 0) onImportado();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  const descargarPlantilla = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/empleados/plantilla`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'plantilla-empleados.xlsx';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Error al descargar plantilla');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Importar empleados desde Excel" size="sm">
      <div className="space-y-5">
        {/* Plantilla */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cgreen-100 dark:bg-cgreen-900/30 rounded-lg flex items-center justify-center">
              <FileSpreadsheet size={16} className="text-cgreen-600 dark:text-cgreen-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Plantilla Excel</p>
              <p className="text-xs text-slate-400">Descarga y completa el formato</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={descargarPlantilla}>
            <Download size={14} />
            Descargar
          </Button>
        </div>

        {/* Columnas reconocidas */}
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Columnas reconocidas automáticamente:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {[
              ['Identificacion *', 'obligatorio'],
              ['NombreCompleto *', 'obligatorio'],
              ['Area *', 'obligatorio'],
              ['Cargo', 'opcional'],
              ['Email', 'opcional'],
              ['Telefono', 'opcional'],
            ].map(([col, tipo]) => (
              <div key={col} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tipo === 'obligatorio' ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className="font-mono">{col}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zona de carga */}
        {!resultado && (
          <div
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
              ${archivo
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10'
                : 'border-slate-300 dark:border-navy-500 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10'}`}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            {archivo ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet size={22} className="text-orange-500" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{archivo.name}</p>
                  <p className="text-xs text-slate-400">{(archivo.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="ml-2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-navy-600 text-slate-400"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Haz clic o arrastra tu archivo
                </p>
                <p className="text-xs text-slate-400 mt-1">Solo archivos .xlsx</p>
              </>
            )}
          </div>
        )}

        {/* Resultados */}
        {resultado && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-cgreen-50 dark:bg-cgreen-900/20 rounded-xl">
                <CheckCircle size={18} className="mx-auto text-cgreen-600 dark:text-cgreen-400 mb-1" />
                <p className="text-2xl font-bold text-cgreen-700 dark:text-cgreen-400">{resultado.creados}</p>
                <p className="text-xs text-cgreen-600 dark:text-cgreen-500">Creados</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-navy-800 rounded-xl">
                <SkipForward size={18} className="mx-auto text-slate-400 mb-1" />
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{resultado.omitidos}</p>
                <p className="text-xs text-slate-500">Omitidos</p>
              </div>
              <div className={`p-3 rounded-xl ${resultado.errores.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-navy-800'}`}>
                <AlertCircle size={18} className={`mx-auto mb-1 ${resultado.errores.length > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                <p className={`text-2xl font-bold ${resultado.errores.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {resultado.errores.length}
                </p>
                <p className={`text-xs ${resultado.errores.length > 0 ? 'text-red-500' : 'text-slate-500'}`}>Errores</p>
              </div>
            </div>

            {resultado.omitidos > 0 && (
              <p className="text-xs text-slate-400 text-center">
                Los omitidos ya existían (identificación duplicada).
              </p>
            )}

            {resultado.errores.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {resultado.errores.map((e, i) => (
                  <div key={i} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg">
                    Fila {e.fila}: {e.mensaje}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            {resultado ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!resultado && (
            <Button onClick={importar} loading={loading} disabled={!archivo}>
              <Upload size={15} />
              Importar
            </Button>
          )}
          {resultado && resultado.creados === 0 && (
            <Button variant="outline" onClick={reset}>
              Intentar de nuevo
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
