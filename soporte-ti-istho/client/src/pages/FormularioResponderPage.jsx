import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { FormularioRenderer } from '../components/formularios/FormularioRenderer';
import { PDFSuccessModal } from '../components/formularios/PDFSuccessModal';
import { formulariosApi } from '../services/formulariosApi';
import { useAuth } from '../context/AuthContext';

export function FormularioResponderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [formulario, setFormulario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [valores, setValores] = useState({});
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const fetchFn = user
      ? () => formulariosApi.obtenerPublico(id).catch(() => formulariosApi.obtener(id))
      : () => formulariosApi.obtenerPublico(id);
    fetchFn()
      .then((res) => { setFormulario(res.data.data); setLoading(false); })
      .catch(() => { toast.error('Formulario no disponible'); setLoading(false); });
  }, [id, user]);

  function validar() {
    if (!formulario) return false;
    for (const campo of formulario.campos || []) {
      if (campo.requerido) {
        const val = valores[campo.id];
        if (val === undefined || val === null || val === '') return false;
        if (Array.isArray(val) && val.length === 0) return false;
      }
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validar()) { toast.error('Completa todos los campos requeridos'); return; }
    setSubmitting(true);
    try {
      const res = await formulariosApi.responder(id, { campos: valores });
      const { pdfGenerado } = res.data.data;
      setSuccessData({ pdfUrl: pdfGenerado?.urlCloudinary, formularioNombre: formulario?.nombre });
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
          valores={valores}
          onChange={setValores}
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting} className="self-end px-8">
          {submitting ? 'Enviando...' : 'Enviar formulario'}
        </Button>
      </form>

      <PDFSuccessModal
        isOpen={Boolean(successData)}
        onClose={() => setSuccessData(null)}
        pdfUrl={successData?.pdfUrl}
        formularioNombre={successData?.formularioNombre}
      />
    </div>
  );
}
