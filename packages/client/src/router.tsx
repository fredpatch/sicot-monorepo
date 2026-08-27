import { createBrowserRouter, createRoutesFromElements, Route, Outlet } from 'react-router-dom';

import App, {
  ProtectedRoute,
  AdminRoute,
  AgentRoute,
  NonAgentRoute,
  RoleRoute,
  LandingRedirect,
} from './App';
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
import AdminPage from './pages/admin/AdminPage';
import PortailPage from './pages/portal/PortalPage';
import PortailTelechargerPage from './pages/portal/PortalDownloadPage';
import AuditPage from './pages/AuditPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ProfilePage from './pages/ProfilePage';
import MonEspacePage from './pages/MonEspacePage';
import MesDemandesPage from './pages/MesDemandesPage';
import MesMissionsPage from './pages/MesMissionsPage';

// Rôles habilités à consulter les registres réservés au personnel CCIT
// (Accords/Partenaires/Missions/Courriers/Analytics/Dashboard) — inchangé,
// juste maintenant appliqué comme garde de route, pas seulement masqué du
// menu (voir RoleRoute dans App.tsx).
const ROLES_CCIT_ADMIN = ['admin', 'super_admin'];

// Rôles habilités aux écrans "métier traduction" (Demandes registre complet,
// Glossaire, Traductions) — traducteur et plus. Les agents ont leurs propres
// écrans dédiés (/mes-demandes, /mes-missions) et ne doivent pas atterrir ici
// même par URL directe.
const ROLES_TRADUCTION_STAFF = ['traducteur', 'relecteur', 'admin', 'super_admin'];

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
        <Route
          path="/dashboard"
          element={
            <NonAgentRoute>
              <DashboardPage />
            </NonAgentRoute>
          }
        />
        <Route
          path="/mon-espace"
          element={
            <AgentRoute>
              <MonEspacePage />
            </AgentRoute>
          }
        />
        <Route
          path="/mes-demandes"
          element={
            <AgentRoute>
              <MesDemandesPage />
            </AgentRoute>
          }
        />
        <Route
          path="/mes-missions"
          element={
            <AgentRoute>
              <MesMissionsPage />
            </AgentRoute>
          }
        />
        <Route
          element={
            <RoleRoute roles={ROLES_CCIT_ADMIN}>
              <Outlet />
            </RoleRoute>
          }
        >
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
        </Route>

        <Route
          element={
            <RoleRoute roles={ROLES_TRADUCTION_STAFF}>
              <Outlet />
            </RoleRoute>
          }
        >
          <Route path="/traductions" element={<TraductionsPage />} />
          <Route path="/traductions/:id" element={<TraductionEditeur />} />
          <Route path="/demandes" element={<DemandesPage />} />
          <Route path="/glossaire" element={<GlossairePage />} />
        </Route>

        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/profil" element={<ProfilePage />} />

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
              <AdminPage />
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

      {/* ── Redirections — atterrissage selon le rôle (lib/landing.ts) ── */}
      <Route path="/" element={<LandingRedirect />} />
      <Route path="*" element={<LandingRedirect />} />

      {/* ── Portail documentaire ───────────────────────────────────── */}
      <Route path="/portal" element={<PortailPage />} />
      <Route path="/portal/telecharger/:token" element={<PortailTelechargerPage />} />
    </Route>
  )
);
