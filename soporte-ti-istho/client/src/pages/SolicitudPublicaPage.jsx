import { useState, useWatch } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { TIPOS_SOLICITUD_LABEL, PRIORIDADES_LABEL } from '../utils/constants';
import { FileUploadZone } from '../components/common/FileUploadZone';

const DESCRIPCION_MAX = 1000;

const schema = z.object({
  tipoSolicitud: z.string().min(1, 'Selecciona el tipo de solicitud'),
  prioridad: z.enum(['critica', 'alta', 'media', 'baja']),
  descripcion: z.string()
    .min(10, 'Describe el problema con al menos 10 caracteres')
    .max(DESCRIPCION_MAX, `Máximo ${DESCRIPCION_MAX} caracteres`),
});

export function SolicitudPublicaPage() {
  const [identificacion, setIdentificacion] = useState('');
  const [empleado, setEmpleado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [resultado, setResultado] = useState(null);
  const [archivos, setArchivos] = useState([]);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { prioridad: 'media' },
  });
  const descripcionValue = useWatch({ control, name: 'descripcion', defaultValue: '' });

  const buscarEmpleado = async () => {
    const id = identificacion.trim();
    if (!id) { setErrorBusqueda('Ingresa tu número de identificación.'); return; }
    if (!/^\d+$/.test(id)) { setErrorBusqueda('La identificación solo debe contener números.'); return; }
    if (id.length < 5) { setErrorBusqueda('La identificación debe tener al menos 5 dígitos.'); return; }
    if (id.length > 20) { setErrorBusqueda('La identificación no puede superar 20 dígitos.'); return; }

    setBuscando(true);
    setErrorBusqueda('');
    setEmpleado(null);
    try {
      const res = await api.get('/empleados/buscar', { params: { identificacion: id } });
      setEmpleado(res.data.data);
    } catch {
      setErrorBusqueda('No se encontró un empleado activo con ese número de identificación.');
    } finally {
      setBuscando(false);
    }
  };

  const cambiarEmpleado = () => {
    setEmpleado(null);
    setIdentificacion('');
    setErrorBusqueda('');
    reset();
    setArchivos([]);
  };

  const onSubmit = async (data) => {
    try {
      const form = new FormData();
      form.append('identificacion', identificacion.trim());
      form.append('tipoSolicitud', data.tipoSolicitud);
      form.append('prioridad', data.prioridad);
      form.append('descripcion', data.descripcion);
      archivos.forEach(f => form.append('archivos', f));

      const res = await api.post('/solicitudes/publica', form);
      setResultado(res.data.data);
      reset();
      setEmpleado(null);
      setIdentificacion('');
      setArchivos([]);
    } catch (err) {
      setErrorBusqueda(err.response?.data?.message || 'Error al enviar la solicitud. Inténtalo de nuevo.');
    }
  };

  if (resultado) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-lg p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-cgreen-100 dark:bg-cgreen-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-cgreen-500" />
            </div>
            <h2 className="text-xl font-bold text-navy-500 dark:text-white">¡Solicitud enviada!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Tu solicitud fue recibida. El equipo de TI la atenderá a la brevedad.
            </p>
            <div className="bg-slate-50 dark:bg-navy-700 rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Número de ticket</span>
                <span className="font-mono font-bold text-orange-500">{resultado.numero}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Empleado</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{resultado.empleado?.nombreCompleto}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Prioridad</span>
                <span className="font-medium text-slate-700 dark:text-slate-200 capitalize">{resultado.prioridad}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Si tienes correo registrado, recibirás actualizaciones automáticas.
            </p>
            <button
              onClick={() => setResultado(null)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              Enviar otra solicitud
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-navy-500 rounded-2xl mb-4">
            <span className="text-white font-bold text-xl">IT</span>
          </div>
          <h1 className="text-2xl font-bold text-navy-500 dark:text-white">Solicitud de Soporte TI</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ISTHO S.A.S. — Ingresa tu identificación y describe tu problema</p>
        </div>

        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-700 p-6 space-y-5">
          {/* Paso 1: identificación */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tu número de identificación <span className="text-red-500">*</span>
            </label>

            {empleado ? (
              <div className="flex items-center justify-between p-3 bg-cgreen-50 dark:bg-cgreen-900/20 rounded-lg border border-cgreen-200 dark:border-cgreen-800">
                <div className="flex items-center gap-2.5">
                  <CheckCircle size={16} className="text-cgreen-600 dark:text-cgreen-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-cgreen-800 dark:text-cgreen-300">{empleado.nombreCompleto}</p>
                    <p className="text-xs text-cgreen-600 dark:text-cgreen-400">{empleado.area}{empleado.cargo ? ` — ${empleado.cargo}` : ''}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cambiarEmpleado}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 transition-colors"
                >
                  <RefreshCw size={12} />
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={identificacion}
                    onChange={e => { setIdentificacion(e.target.value.replace(/\D/g, '')); setErrorBusqueda(''); }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarEmpleado())}
                    placeholder="Ej: 1234567890"
                    maxLength={20}
                    inputMode="numeric"
                    className={`flex-1 px-3 py-2.5 rounded-lg border text-sm bg-white dark:bg-navy-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors
                      ${errorBusqueda ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-navy-500'}`}
                  />
                  <button
                    type="button"
                    onClick={buscarEmpleado}
                    disabled={buscando || !identificacion.trim()}
                    className="px-4 py-2.5 bg-navy-500 hover:bg-navy-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    {buscando ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                    Buscar
                  </button>
                </div>
                {errorBusqueda && (
                  <div className="mt-2 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle size={14} />
                    {errorBusqueda}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Formulario (solo visible si se encontró empleado) */}
          {empleado && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2 border-t border-slate-100 dark:border-navy-700">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Tipo de solicitud <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('tipoSolicitud')}
                  className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="">Seleccionar...</option>
                  {Object.entries(TIPOS_SOLICITUD_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                {errors.tipoSolicitud && <p className="text-xs text-red-500">{errors.tipoSolicitud.message}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prioridad</label>
                <select
                  {...register('prioridad')}
                  className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-navy-500 text-sm bg-white dark:bg-navy-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {Object.entries(PRIORIDADES_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Descripción del problema <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs ${(descripcionValue?.length ?? 0) > DESCRIPCION_MAX * 0.9 ? 'text-orange-500' : 'text-slate-400'}`}>
                    {descripcionValue?.length ?? 0}/{DESCRIPCION_MAX}
                  </span>
                </div>
                <textarea
                  {...register('descripcion')}
                  rows={4}
                  placeholder="Describe el problema con el mayor detalle posible: qué pasó, desde cuándo, qué equipo o sistema afecta..."
                  className={`px-3 py-2.5 rounded-lg border text-sm bg-white dark:bg-navy-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none transition-colors
                    ${errors.descripcion ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-navy-500'}`}
                />
                {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Archivos adjuntos <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <FileUploadZone files={archivos} onChange={setArchivos} />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          ¿Eres del equipo de TI?{' '}
          <a href="/login" className="text-orange-500 hover:text-orange-600 font-medium">Iniciar sesión</a>
        </p>
      </div>
    </div>
  );
}
