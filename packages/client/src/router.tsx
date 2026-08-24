import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';

import App, { ProtectedRoute, AdminRoute } from './App';
import Layout from './components/layouts/Layout';
import LoginPage from './pages/LoginPage';
import DocumentsPage from './pages/DocumentsPage';
import PartenairesPage from './pages/PartenairesPage';
import PartenaireDetailPage from './pages/partenaires/components/PartenaireDetailPage';
import PartenaireFormPage from './pages/partenaires/components/PartenaireFormPage';
import BootstrapPage from './pages/BootstrapPage';
import AccordsPage from './pages/AccordsPage';
import AccordFormPage from './pages/accords/components/AccordFormPage';
import CourriersPage from './pages/CourriersPage';
import CourrierDetailPage from './pages/courriers/CourrierDetailPage';
import CourrierFormPage from './pages/courriers/CourrierFormPage';
import MissionsPage from './pages/MissionsPage';
import MissionDetailPage from './pages/missions/MissionDetailPage';
import MissionFormPage from './pages/missions/components/MissionFormPage';
import GlossairePage from './pages/GlossairePage';
import TraductionsPage from './pages/TraductionsPage';
import TraductionEditeur from './pages/traductions/components/TraductionEditeur';
import DemandesPage from './pages/DemandesPage';
import DashboardPage from './pages/DashboardPage';
import AdminParametresPage from './pages/AdminParametresPage';
import PortailPage from './pages/PortalPage';
import AuditPage from './pages/AuditPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminUsersPage from './pages/AdminUsersPage';

// Data router (createBrowserRouter) rather than plain <BrowserRouter>/<Routes> —
// required so react-router's useBlocker (unsaved-changes protection in the
// Traductions workshop) works. App is the root element for every route: it
// owns the auth-session check and renders <Outlet /> once resolved.
export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<App />}>
      {/* ── Bootstrap — premier démarrage ─────────────────────────── */}
      <Route path="/bootstrap" element={<BootstrapPage />} />

      {/* ── Routes publiques ──────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── Routes protégées dans le Layout ───────────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/accords" element={<AccordsPage />} />
        <Route path="/accords/:id" element={<AccordsPage />} />
        <Route path="/accords/new" element={<AccordFormPage />} />
        <Route path="/accords/:id/edit" element={<AccordFormPage />} />
        <Route path="/partenaires" element={<PartenairesPage />} />
        <Route path="/partenaires/new" element={<PartenaireFormPage />} />
        <Route path="/partenaires/:id" element={<PartenaireDetailPage />} />
        <Route path="/partenaires/:id/edit" element={<PartenaireFormPage />} />
        <Route path="/missions" element={<MissionsPage />} />
        <Route path="/missions/new" element={<MissionFormPage />} />
        <Route path="/missions/:id/edit" element={<MissionFormPage />} />
        <Route path="/missions/:id" element={<MissionDetailPage />} />
        <Route path="/courriers" element={<CourriersPage />} />
        <Route path="/courriers/new" element={<CourrierFormPage />} />
        <Route path="/courriers/:id/edit" element={<CourrierFormPage />} />
        <Route path="/courriers/:id" element={<CourrierDetailPage />} />
        <Route path="/traductions" element={<TraductionsPage />} />
        <Route path="/traductions/:id" element={<TraductionEditeur />} />
        <Route path="/demandes" element={<DemandesPage />} />
        <Route path="/glossaire" element={<GlossairePage />} />
        <Route path="/documents" element={<DocumentsPage />} />

        <Route
          path="/utilisateurs"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminParametresPage />
            </AdminRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <AdminRoute>
              <AuditPage />
            </AdminRoute>
          }
        />
      </Route>

      {/* ── Redirections ──────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />

      {/* ── Portail documentaire ───────────────────────────────────── */}
      <Route path="/portal" element={<PortailPage />} />
    </Route>
  )
);
