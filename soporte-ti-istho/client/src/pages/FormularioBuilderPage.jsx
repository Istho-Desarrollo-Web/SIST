import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, ArrowLeft, X, CheckCircle2, FileText, Settings, MapPin, Users, Lock } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { FileUploadZone } from '../components/common/FileUploadZone';
import { CamposList } from '../components/formularios/CamposList';
import { PDFMapper } from '../components/formularios/PDFMapper';
import { formulariosApi } from '../services/formulariosApi';

const TABS = [
  { id: 'config', label: 'Configuración' },
  { id: 'campos', label: 'Campos' },
  { id: 'pdf', label: 'PDF & Mapeo' },
  { id: 'resumen', label: 'Resumen' },
];

const ACCESO_OPTIONS = [
  { value: 'autenticado', label: 'Solo usuarios autenticados' },
  { value: 'publico', label: 'Público (sin login)' },
];

export function FormularioBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [tab, setTab] = useState('config');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [campos, setCampos] = useState([]);
  const [config, setConfig] = useState({ nombre: '', descripcion: '', acceso: 'autenticado', activo: true });
  const [pdfFiles, setPdfFiles] = useState([]);
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
    if (!config.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      let fId = formularioId;
      const esNuevo = !fId;
      if (fId) {
        await formulariosApi.actualizar(fId, config);
      } else {
        const res = await formulariosApi.crear(config);
        fId = res.data.data.id;
        setFormularioId(fId);
        navigate(`/formularios/${fId}/editar`, { replace: true });
      }
      toast.success(esNuevo ? 'Formulario creado' : 'Configuración guardada');
      if (esNuevo) setTab('campos');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function guardarCampos() {
    let fId = formularioId;
    if (!fId) {
      if (!config.nombre.trim()) {
        toast.error('Completa el nombre del formulario en Configuración primero');
        setTab('config');
        return;
      }
      try {
        const res = await formulariosApi.crear({ ...config });
        fId = res.data.data.id;
        setFormularioId(fId);
        navigate(`/formularios/${fId}/editar`, { replace: true });
      } catch {
        toast.error('Error al crear formulario');
        return;
      }
    }
    setSaving(true);
    try {
      const res = await formulariosApi.guardarCampos(fId, campos);
      const savedCampos = res.data.data;
      setCampos(prev => prev.map((c, i) => ({ ...c, id: savedCampos[i]?.id ?? c.id })));
      toast.success('Campos guardados');
    } catch {
      toast.error('Error al guardar campos');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubirPlantilla(newFiles) {
    const added = newFiles.find(f => !pdfFiles.some(p => p.name === f.name && p.size === f.size));
    setPdfFiles(newFiles.slice(0, 1));
    if (!added) return;

    let fId = formularioId;
    if (!fId) {
      try {
        const res = await formulariosApi.crear({
          ...config,
          nombre: config.nombre.trim() || 'Nuevo formulario',
        });
        fId = res.data.data.id;
        setFormularioId(fId);
        navigate(`/formularios/${fId}/editar`, { replace: true });
      } catch {
        toast.error('Error al crear formulario');
        return;
      }
    }

    const fd = new FormData();
    fd.append('archivo', added);
    try {
      const res = await formulariosApi.subirPlantilla(fId, fd);
      setPlantilla(res.data.data.plantilla);
      setCamposPDF(res.data.data.camposPDF || []);
      setMapeoInicial([]);
      setPdfFiles([]);
      toast.success('Plantilla subida');
    } catch {
      toast.error('Error al subir plantilla');
    }
  }

  async function handleGuardarMapeos(mapeos) {
    if (!formularioId) return;
    try {
      await formulariosApi.guardarMapeos(formularioId, mapeos);
      setMapeoInicial(mapeos);
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
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex-1 min-w-0">
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
                <button
                  type="button"
                  onClick={() => { setPlantilla(null); setCamposPDF([]); setMapeoInicial([]); }}
                  className="shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-navy-600 text-slate-400 hover:text-red-500 transition-colors"
                  title="Quitar plantilla"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <FileUploadZone
              files={pdfFiles}
              onChange={handleSubirPlantilla}
              accept=".pdf"
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

      {/* Tab: Resumen */}
      {tab === 'resumen' && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Revisá todo antes de guardar. Podés volver a cualquier pestaña para hacer cambios.
          </p>

          {/* Config */}
          <div className="rounded-xl border border-slate-200 dark:border-navy-600 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-navy-700 border-b border-slate-200 dark:border-navy-600">
              <Settings className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Configuración</span>
            </div>
            <div className="px-4 py-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold mb-0.5">Nombre</p>
                <p className="text-slate-800 dark:text-slate-100">{config.nombre || <span className="text-red-400 italic">Sin nombre</span>}</p>
              </div>
              {config.descripcion && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400 uppercase font-semibold mb-0.5">Descripción</p>
                  <p className="text-slate-600 dark:text-slate-300">{config.descripcion}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold mb-0.5">Acceso</p>
                <div className="flex items-center gap-1.5">
                  {config.acceso === 'publico'
                    ? <><Users className="w-3.5 h-3.5 text-cgreen-500" /><span className="text-cgreen-600 dark:text-cgreen-400">Público</span></>
                    : <><Lock className="w-3.5 h-3.5 text-orange-500" /><span className="text-orange-600 dark:text-orange-400">Solo autenticados</span></>}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold mb-0.5">Estado</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.activo ? 'bg-cgreen-100 dark:bg-cgreen-900/30 text-cgreen-700 dark:text-cgreen-400' : 'bg-slate-100 dark:bg-navy-600 text-slate-500'}`}>
                  {config.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Campos */}
          <div className="rounded-xl border border-slate-200 dark:border-navy-600 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-navy-700 border-b border-slate-200 dark:border-navy-600">
              <FileText className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Campos <span className="text-slate-400 font-normal">({campos.length})</span>
              </span>
            </div>
            {campos.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-400 italic">Sin campos definidos</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-navy-600">
                {campos.map((c, i) => (
                  <li key={c.id || i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-700 dark:text-slate-200">{c.etiqueta || c.nombre || `Campo ${i + 1}`}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{c.tipo}</span>
                      {c.requerido && <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Requerido</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Plantilla PDF */}
          <div className="rounded-xl border border-slate-200 dark:border-navy-600 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-navy-700 border-b border-slate-200 dark:border-navy-600">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Plantilla PDF & Mapeo</span>
            </div>
            <div className="px-4 py-4 text-sm">
              {plantilla ? (
                <div className="flex flex-col gap-1">
                  <p className="text-slate-700 dark:text-slate-200">
                    <span className="text-slate-400">Archivo: </span>
                    <a href={plantilla.urlCloudinary} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">{plantilla.nombre}</a>
                    {plantilla.tieneAcroform && <span className="ml-2 text-xs bg-navy-100 dark:bg-navy-600 text-navy-600 dark:text-slate-300 px-1.5 py-0.5 rounded">AcroForm</span>}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {mapeoInicial.length} campo{mapeoInicial.length !== 1 ? 's' : ''} mapeado{mapeoInicial.length !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 italic">Sin plantilla PDF configurada</p>
              )}
            </div>
          </div>

          {/* Botón guardar todo */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={guardarConfig}
              disabled={saving || !config.nombre.trim()}
              className="gap-2 px-8"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Guardando...' : (formularioId ? 'Confirmar y guardar' : 'Confirmar y crear')}
            </Button>
          </div>
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
