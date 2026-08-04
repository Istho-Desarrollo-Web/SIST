import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, X, CheckCircle, AlertCircle, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import api from '../../services/api';

const COLUMNAS = [
  ['Identificacion *', true], ['NombreCompleto *', true], ['Area *', true],
  ['Cargo', false], ['Email', false], ['Telefono', false], ['Activo', false],
];

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
      const r = res.data.data;
      setResultado(r);
      if (r.creados > 0) {
        toast.success(`${r.creados} empleado${r.creados !== 1 ? 's' : ''} importado${r.creados !== 1 ? 's' : ''} correctamente`);
        onImportado();
      } else {
        toast.info('No se crearon empleados nuevos');
      }
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--color-success-subtle-bg)', display: 'grid', placeItems: 'center' }}>
              <FileSpreadsheet size={16} color="var(--color-success-subtle-text)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Plantilla Excel</p>
              <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>Descarga y completa el formato</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={descargarPlantilla}>
            <Download size={14} />
            Descargar
          </Button>
        </div>

        <div style={{ fontSize: 12 }}>
          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Columnas reconocidas automáticamente:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
            {COLUMNAS.map(([col, obligatorio]) => (
              <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: obligatorio ? 'var(--color-accent)' : 'var(--color-border-strong)' }} />
                <span style={{ fontFamily: 'var(--font-mono)' }}>{col}</span>
              </div>
            ))}
          </div>
        </div>

        {!resultado && (
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              border: `1px dashed ${archivo ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
              borderRadius: 'var(--radius-md)', padding: 24, textAlign: 'center', cursor: 'pointer',
              background: archivo ? 'var(--accent-100)' : 'transparent',
            }}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
            {archivo ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <FileSpreadsheet size={22} color="var(--color-accent)" />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{archivo.name}</p>
                  <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>{(archivo.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); reset(); }} className="cx-btn cx-btn-ghost cx-btn-icon" style={{ padding: 4 }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Haz clic o arrastra tu archivo</p>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>Solo archivos .xlsx</p>
              </>
            )}
          </div>
        )}

        {resultado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
              <div style={{ padding: 12, background: 'var(--color-success-subtle-bg)', borderRadius: 'var(--radius-md)' }}>
                <CheckCircle size={18} color="var(--color-success-subtle-text)" style={{ margin: '0 auto 4px' }} />
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-success-subtle-text)' }}>{resultado.creados}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--color-success-subtle-text)' }}>Creados</p>
              </div>
              <div style={{ padding: 12, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                <SkipForward size={18} color="var(--color-text-muted)" style={{ margin: '0 auto 4px' }} />
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{resultado.omitidos}</p>
                <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>Omitidos</p>
              </div>
              <div style={{ padding: 12, borderRadius: 'var(--radius-md)', background: resultado.errores.length > 0 ? 'var(--color-danger-subtle-bg)' : 'var(--color-surface)' }}>
                <AlertCircle size={18} color={resultado.errores.length > 0 ? 'var(--color-danger-subtle-text)' : 'var(--color-text-muted)'} style={{ margin: '0 auto 4px' }} />
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: resultado.errores.length > 0 ? 'var(--color-danger-subtle-text)' : 'var(--color-text)' }}>{resultado.errores.length}</p>
                <p style={{ margin: 0, fontSize: 11, color: resultado.errores.length > 0 ? 'var(--color-danger-subtle-text)' : 'var(--color-text-muted)' }}>Errores</p>
              </div>
            </div>

            {resultado.omitidos > 0 && (
              <p className="text-muted" style={{ fontSize: 11, textAlign: 'center', margin: 0 }}>Los omitidos ya existían (identificación duplicada).</p>
            )}

            {resultado.errores.length > 0 && (
              <div style={{ maxHeight: 128, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {resultado.errores.map((e, i) => (
                  <div key={i} style={{ fontSize: 11, background: 'var(--color-danger-subtle-bg)', color: 'var(--color-danger-subtle-text)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                    Fila {e.fila}: {e.mensaje}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={handleClose}>{resultado ? 'Cerrar' : 'Cancelar'}</Button>
          {!resultado && (
            <Button onClick={importar} loading={loading} disabled={!archivo}>
              <Upload size={15} />
              Importar
            </Button>
          )}
          {resultado && resultado.creados === 0 && (
            <Button variant="secondary" onClick={reset}>Intentar de nuevo</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
