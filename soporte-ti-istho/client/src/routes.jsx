import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { useAuth } from './context/AuthContext';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SolicitudesPage } from './pages/SolicitudesPage';
import { SolicitudPublicaPage } from './pages/SolicitudPublicaPage';
import { EmpleadosPage } from './pages/EmpleadosPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { ReportesPage } from './pages/ReportesPage';
import { PerfilPage } from './pages/PerfilPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { FormulariosHomePage } from './pages/FormulariosHomePage';
import { FormularioBuilderPage } from './pages/FormularioBuilderPage';
import { FormularioResponderPage } from './pages/FormularioResponderPage';
import { FormularioPDFsPage } from './pages/FormularioPDFsPage';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

export function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/solicitud" element={<SolicitudPublicaPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route path="/dashboard" element={
        <ProtectedRoute roles={['admin', 'tecnico']}>
          <AppLayout><DashboardPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/solicitudes" element={
        <ProtectedRoute>
          <AppLayout><SolicitudesPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/empleados" element={
        <ProtectedRoute roles={['admin', 'tecnico']}>
          <AppLayout><EmpleadosPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/usuarios" element={
        <ProtectedRoute roles={['admin']}>
          <AppLayout><UsuariosPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/reportes" element={
        <ProtectedRoute roles={['admin', 'tecnico']}>
          <AppLayout><ReportesPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/perfil" element={
        <ProtectedRoute>
          <AppLayout><PerfilPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Formularios — Home (accesible para todos) */}
      <Route path="/formularios" element={
        <AppLayout><FormulariosHomePage /></AppLayout>
      } />

      {/* Formularios — Responder (accesible sin auth para formularios públicos) */}
      <Route path="/formularios/:id/responder" element={
        <AppLayout><FormularioResponderPage /></AppLayout>
      } />

      {/* Formularios — Builder (solo admin/tecnico) */}
      <Route path="/formularios/nuevo" element={
        <ProtectedRoute roles={['admin', 'tecnico']}>
          <AppLayout><FormularioBuilderPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/formularios/:id/editar" element={
        <ProtectedRoute roles={['admin', 'tecnico']}>
          <AppLayout><FormularioBuilderPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Formularios — PDFs (solo admin/tecnico) */}
      <Route path="/formularios/pdfs" element={
        <ProtectedRoute roles={['admin', 'tecnico']}>
          <AppLayout><FormularioPDFsPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
