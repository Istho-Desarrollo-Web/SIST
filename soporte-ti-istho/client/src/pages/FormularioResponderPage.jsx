import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Skeleton } from '../components/common/Skeleton';
import { FormularioRenderer } from '../components/formularios/FormularioRenderer';
import { useCondicionales } from '../components/formularios/useCondicionales';
import { PDFSuccessModal } from '../components/formularios/PDFSuccessModal';
import { formulariosApi } from '../services/formulariosApi';
import { useAuth } from '../context/AuthContext';

export function FormularioResponderPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [formulario, setFormulario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [valores, setValores] = useState({});
  const [successData, setSuccessData] = useState(null);
  const [nombreRespondente, setNombreRespondente] = useState('');
  const [nombreConfirmado, setNombreConfirmado] = useState(false);

  useEffect(() => {
    formulariosApi.obtenerParaResponder(id)
      .then((res) => { setFormulario(res.data.data); setLoading(false); })
      .catch(() => { toast.error('Formulario no disponible'); setLoading(false); });
  }, [id]);

  const { camposVisibles, seccionesVisibles } = useCondicionales(
    formulario?.campos || [],
    formulario?.secciones || [],
    valores
  );

  useEffect(() => {
    if (!formulario) return;
    setValores(prev => {
      const next = { ...prev };
      let changed = false;
      for (const campo of formulario.campos || []) {
        if (!camposVisibles.has(campo.id) && campo.id in next) {
          delete next[campo.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [camposVisibles, formulario]);

  function validar() {
    if (!formulario) return false;
    for (const campo of formulario.campos || []) {
      if (!camposVisibles.has(campo.id)) continue;
      if (!campo.requerido) continue;
      const val = valores[campo.id];
      if (val === undefined || val === null || val === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      if (campo.tipo === 'grilla') {
        const opts = campo.opciones || {};
        const filas = Array.isArray(opts.filas) ? opts.filas : [];
        const sinColumna = filas.some((_, idx) => {
          const entry = Array.isArray(val) ? val.find(e => e.fila === idx) : null;
          return !entry || !entry.columna;
        });
        if (sinColumna) return false;
      }
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validar()) { toast.error('Completa todos los campos requeridos'); return; }
    setSubmitting(true);
    try {
      const valoresFiltrados = {};
      for (const campo of formulario.campos || []) {
        if (camposVisibles.has(campo.id) && campo.id in valores) {
          valoresFiltrados[campo.id] = valores[campo.id];
        }
      }
      const body = { campos: valoresFiltrados };
      if (!isAuthenticated && nombreRespondente.trim()) {
        body.nombreRespondente = nombreRespondente.trim();
      }
      const res = await formulariosApi.responder(id, body);
      const { respuesta, pdfGenerado } = res.data.data;
      setValores({});
      setSuccessData({ respuestaId: pdfGenerado ? respuesta?.id : null, formularioNombre: formulario?.nombre });
    } catch {
      toast.error('Error al enviar el formulario');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!formulario) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-500 dark:text-slate-400">
        Formulario no disponible
      </div>
    );
  }

  // Paso de captura de nombre para anónimos en formularios públicos
  if (!isAuthenticated && formulario.acceso === 'publico' && !nombreConfirmado) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy-700 dark:text-slate-100">{formulario.nombre}</h1>
          {formulario.descripcion && (
            <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">{formulario.descripcion}</p>
          )}
        </div>
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Antes de continuar</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">¿Cuál es tu nombre?</p>
          <Input
            label="Nombre"
            value={nombreRespondente}
            onChange={(e) => setNombreRespondente(e.target.value)}
            placeholder="Tu nombre completo"
            onKeyDown={(e) => { if (e.key === 'Enter' && nombreRespondente.trim()) setNombreConfirmado(true); }}
          />
          <Button
            className="mt-4 w-full justify-center"
            disabled={!nombreRespondente.trim()}
            onClick={() => setNombreConfirmado(true)}
          >
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-700 dark:text-slate-100">{formulario.nombre}</h1>
        {formulario.descripcion && (
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">{formulario.descripcion}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormularioRenderer
          campos={formulario.campos || []}
          secciones={formulario.secciones || []}
          valores={valores}
          onChange={setValores}
          disabled={submitting}
          camposVisibles={camposVisibles}
          seccionesVisibles={seccionesVisibles}
        />
        <Button type="submit" disabled={submitting} className="self-end px-8">
          {submitting ? 'Enviando...' : 'Enviar formulario'}
        </Button>
      </form>

      <PDFSuccessModal
        isOpen={Boolean(successData)}
        onClose={() => setSuccessData(null)}
        respuestaId={successData?.respuestaId}
        formularioNombre={successData?.formularioNombre}
      />
    </div>
  );
}
