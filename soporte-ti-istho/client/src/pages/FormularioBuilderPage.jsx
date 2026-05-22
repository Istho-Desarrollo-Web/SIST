import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { FileUploadZone } from '../components/common/FileUploadZone';
import { CamposList } from '../components/formularios/CamposList';
import { PDFMapper } from '../components/formularios/PDFMapper';
import { formulariosApi } from '../services/formulariosApi';

const TABS = [
  { id: 'campos', label: 'Campos' },
  { id: 'pdf', label: 'PDF & Mapeo' },
  { id: 'config', label: 'Configuración' },
];

const ACCESO_OPTIONS = [
  { value: 'autenticado', label: 'Solo usuarios autenticados' },
  { value: 'publico', label: 'Público (sin login)' },
];

export function FormularioBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [tab, setTab] = useState('campos');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [campos, setCampos] = useState([]);
  const [config, setConfig] = useState({ nombre: '', descripcion: '', acceso: 'autenticado', activo: true });
  const [plantilla, setPlantilla] = useState(null);
  const [camposPDF, setCamposPDF] = useState([]);
  const [mapeoInicial, setMapeoInicial] = useState([]);
  const [formularioId, setFormularioId] = useState(id || null);

  useEffect(() => {
    if (!isEditing) return;
    formulariosApi.obtener(id).then((res) => {
      const f = res.data.data;
      setConfig({ nombre: f.nombre, descripcion: f.descripcion || '', acceso: f.acceso, activo: f.activo });
      setCampos(f.campos || []);
      if (f.plantillas && f.plantillas.length > 0) {
        setPlantilla(f.plantillas[0]);
        setMapeoInicial(f.plantillas[0].mapeos || []);
      }
      setLoading(false);
    }).catch(() => {
      toast.error('Error al cargar formulario');
      setLoading(false);
    });
  }, [id, isEditing]);

  async function guardarConfig() {
    setSaving(true);
    try {
      if (formularioId) {
        await formulariosApi.actualizar(formularioId, config);
        toast.success('Configuración guardada');
      } else {
        const res = await formulariosApi.crear(config);
        const newId = res.data.data.id;
        setFormularioId(newId);
        navigate(`/formularios/${newId}/editar`, { replace: true });
        toast.success('Formulario creado');
      }
    } catch {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  }

  async function guardarCampos() {
    if (!formularioId) { toast.error('Guarda la configuración primero'); return; }
    setSaving(true);
    try {
      await formulariosApi.guardarCampos(formularioId, campos);
      toast.success('Campos guardados');
    } catch {
      toast.error('Error al guardar campos');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubirPlantilla(file) {
    if (!formularioId) { toast.error('Guarda la configuración primero'); return; }
    const fd = new FormData();
    fd.append('archivo', file);
    try {
      const res = await formulariosApi.subirPlantilla(formularioId, fd);
      setPlantilla(res.data.data.plantilla);
      setCamposPDF(res.data.data.camposPDF || []);
      setMapeoInicial([]);
      toast.success('Plantilla subida');
    } catch {
      toast.error('Error al subir plantilla');
    }
  }

  async function handleGuardarMapeos(mapeos) {
    if (!formularioId) return;
    try {
      await formulariosApi.guardarMapeos(formularioId, mapeos);
      toast.success('Mapeo guardado');
    } catch {
      toast.error('Error al guardar mapeo');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-6" />
        <div className="h-64 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/formularios')}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-navy-700 dark:text-slate-100">
          {isEditing ? 'Editar formulario' : 'Nuevo formulario'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-navy-600 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Campos */}
      {tab === 'campos' && (
        <div className="flex flex-col gap-4">
          <CamposList campos={campos} onChange={setCampos} />
          <div className="flex justify-end pt-2">
            <Button onClick={guardarCampos} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar campos
            </Button>
          </div>
        </div>
      )}

      {/* Tab: PDF & Mapeo */}
      {tab === 'pdf' && (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Plantilla PDF
            </h3>
            {plantilla && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Actual:{' '}
                <a
                  href={plantilla.urlCloudinary}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline"
                >
                  {plantilla.nombre}
                </a>
                {plantilla.tieneAcroform && ' · AcroForm detectado'}
              </p>
            )}
            <FileUploadZone
              accept="application/pdf"
              maxFiles={1}
              onFileSelect={handleSubirPlantilla}
              label={plantilla ? 'Reemplazar plantilla' : 'Subir plantilla PDF'}
            />
          </div>
          <PDFMapper
            campos={campos}
            plantilla={plantilla}
            mapeoInicial={mapeoInicial}
            camposPDF={camposPDF}
            onSave={handleGuardarMapeos}
          />
        </div>
      )}

      {/* Tab: Configuración */}
      {tab === 'config' && (
        <div className="flex flex-col gap-4 max-w-lg">
          <Input
            label="Nombre del formulario *"
            value={config.nombre}
            onChange={(e) => setConfig((c) => ({ ...c, nombre: e.target.value }))}
            placeholder="Ej: Solicitud de equipo"
          />
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Descripción
            </label>
            <textarea
              value={config.descripcion}
              onChange={(e) => setConfig((c) => ({ ...c, descripcion: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-500 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
              placeholder="Descripción breve del formulario"
            />
          </div>
          <Select
            label="Acceso"
            value={config.acceso}
            onChange={(v) => setConfig((c) => ({ ...c, acceso: v }))}
            options={ACCESO_OPTIONS}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.activo}
              onChange={(e) => setConfig((c) => ({ ...c, activo: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            Formulario activo (visible para usuarios)
          </label>
          <div className="flex justify-end pt-2">
            <Button
              onClick={guardarConfig}
              disabled={saving || !config.nombre.trim()}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {formularioId ? 'Guardar cambios' : 'Crear formulario'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
