import { Component } from 'react';
import { LogoIcon } from './LogoSIST';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl">
            <LogoIcon size={36} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-500 dark:text-white">Algo salió mal</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Ocurrió un error inesperado en la aplicación.
            </p>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}
