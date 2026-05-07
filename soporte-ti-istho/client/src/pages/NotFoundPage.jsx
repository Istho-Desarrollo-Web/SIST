import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-slate-50 dark:bg-navy-900">
      <p className="text-8xl font-bold text-navy-500 dark:text-white mb-4">404</p>
      <h1 className="text-2xl font-semibold text-navy-500 dark:text-white mb-2">Página no encontrada</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-6">La ruta que buscas no existe.</p>
      <Link to="/" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
        Ir al inicio
      </Link>
    </div>
  );
}
