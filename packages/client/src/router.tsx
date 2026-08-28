import { createRoutesFromElements, Route } from 'react-router-dom';

import App, { ProtectedRoute, CapabilityRoute, LandingRedirect } from './App';
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
import AidePage from './pages/aide/AidePage';
import AideArticlePage from './pages/aide/AideArticlePage';

// Route tree only - createBrowserRouter(routeConfig) itself now lives in
// main.tsx (its only real caller), deliberately kept out of this module:
// createBrowserRouter() calls createBrowserHistory() eagerly, which needs
// `document` and so cannot be imported in this package's plain
// node-environment vitest (no jsdom, see help-map.test.ts's header comment).
// routeConfig is a plain RouteObject[] with no DOM dependency, which is
// what router.routes.test.ts inspects to verify route-capability wiring
// (Phase 10.2 authorization-alignment fix).
export const routeConfig = createRoutesFromElements(
  <Route element={<App />}>
    {/* ── Bootstrap - premier démarrage ─────────────────────────── */}
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
      {/* Dashboard - vue d'ensemble multi-modules (accords/courriers/
            missions/analytics) ; ANALYTICS_VIEW = admin+, décision prise
            après audit du contenu réel (Phase 5.1). */}
      <Route
        path="/dashboard"
        element={
          <CapabilityRoute capability="ANALYTICS_VIEW">
            <DashboardPage />
          </CapabilityRoute>
        }
      />

      {/* Routes personnelles - capacités présentes chez agent ET operateur/
            admin/super_admin (héritage additif du modèle de capacités), donc
            accessibles aux quatre rôles cibles, pas seulement agent. */}
      <Route
        path="/mon-espace"
        element={
          <CapabilityRoute capability="PERSONAL_WORKSPACE_VIEW">
            <MonEspacePage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/mes-demandes"
        element={
          <CapabilityRoute capability="REQUEST_VIEW_OWN">
            <MesDemandesPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/mes-missions"
        element={
          <CapabilityRoute capability="MISSION_VIEW_OWN">
            <MesMissionsPage />
          </CapabilityRoute>
        }
      />

      {/* Registres globaux "coopération" - admin+ (AGREEMENT_VIEW/
            PARTNER_VIEW/MISSION_REGISTRY_VIEW/CORRESPONDENCE_VIEW sont
            toutes admin+ dans le modèle de capacités, même ensemble
            qu'avant). Distinct de /mes-missions (MISSION_VIEW_OWN) -
            un admin/super_admin garde accès aux deux. */}
      <Route
        path="/accords"
        element={
          <CapabilityRoute capability="AGREEMENT_VIEW">
            <AccordsPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/accords/:id"
        element={
          <CapabilityRoute capability="AGREEMENT_VIEW">
            <AccordsPage />
          </CapabilityRoute>
        }
      />
      {/* Mutation-oriented - AGREEMENT_MANAGE, distinct from the viewing
            route above (AGREEMENT_VIEW). Both happen to be granted together
            today (admin+), but the guard should express the real contract
            rather than that bundling (Phase 10.5 alignment fix, same rule
            as Phase 10.2's mission route guards). */}
      <Route
        path="/accords/new"
        element={
          <CapabilityRoute capability="AGREEMENT_MANAGE">
            <AccordFormPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/accords/:id/edit"
        element={
          <CapabilityRoute capability="AGREEMENT_MANAGE">
            <AccordFormPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/partenaires"
        element={
          <CapabilityRoute capability="PARTNER_VIEW">
            <PartenairesPage />
          </CapabilityRoute>
        }
      />
      {/* Mutation-oriented - PARTNER_MANAGE, distinct from the viewing
            routes (PARTNER_VIEW). Phase 10.5 alignment fix, same rule as
            Phase 10.2's mission route guards. */}
      <Route
        path="/partenaires/new"
        element={
          <CapabilityRoute capability="PARTNER_MANAGE">
            <PartenaireFormPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/partenaires/:id"
        element={
          <CapabilityRoute capability="PARTNER_VIEW">
            <PartenaireDetailPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/partenaires/:id/edit"
        element={
          <CapabilityRoute capability="PARTNER_MANAGE">
            <PartenaireFormPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/missions"
        element={
          <CapabilityRoute capability="MISSION_REGISTRY_VIEW">
            <MissionsPage />
          </CapabilityRoute>
        }
      />
      {/* Mutation-oriented - MISSION_MANAGE, distinct from the viewing
            routes above (MISSION_REGISTRY_VIEW). Both happen to be granted
            together today (admin+), but the guard should express the real
            contract rather than that bundling (Phase 10.2 alignment fix). */}
      <Route
        path="/missions/new"
        element={
          <CapabilityRoute capability="MISSION_MANAGE">
            <MissionFormPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/missions/:id/edit"
        element={
          <CapabilityRoute capability="MISSION_MANAGE">
            <MissionFormPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/missions/:id"
        element={
          <CapabilityRoute capability="MISSION_REGISTRY_VIEW">
            <MissionDetailPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/courriers"
        element={
          <CapabilityRoute capability="CORRESPONDENCE_VIEW">
            <CourriersPage />
          </CapabilityRoute>
        }
      />
      {/* Mutation-oriented - CORRESPONDENCE_MANAGE, distinct from the
            viewing route above (CORRESPONDENCE_VIEW). Phase 10.5 alignment
            fix, same rule as Phase 10.2's mission route guards. */}
      <Route
        path="/courriers/new"
        element={
          <CapabilityRoute capability="CORRESPONDENCE_MANAGE">
            <CourrierFormPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/courriers/:id/edit"
        element={
          <CapabilityRoute capability="CORRESPONDENCE_MANAGE">
            <CourrierFormPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/courriers/:id"
        element={
          <CapabilityRoute capability="CORRESPONDENCE_VIEW">
            <CourrierDetailPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <CapabilityRoute capability="ANALYTICS_VIEW">
            <AnalyticsPage />
          </CapabilityRoute>
        }
      />

      {/* Écrans opérationnels traduction - operateur+ (agent exclu, a ses
            propres écrans personnels ci-dessus). */}
      <Route
        path="/traductions"
        element={
          <CapabilityRoute capability="TRANSLATION_VIEW">
            <TraductionsPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/traductions/:id"
        element={
          <CapabilityRoute capability="TRANSLATION_VIEW">
            <TraductionEditeur />
          </CapabilityRoute>
        }
      />
      <Route
        path="/demandes"
        element={
          <CapabilityRoute capability="REQUEST_QUEUE_VIEW">
            <DemandesPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/glossaire"
        element={
          <CapabilityRoute capability="GLOSSARY_VIEW">
            <GlossairePage />
          </CapabilityRoute>
        }
      />

      {/* Authentification seule - la capacité n'ajoute rien ici : le
            scoping réel (bibliothèque complète vs documents personnels)
            se fait déjà côté API selon DOCUMENT_UPLOAD (Phase 4.7),
            inchangé, aucun rôle n'a jamais été exclu de cette route. */}
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/profil" element={<ProfilePage />} />

      {/* Centre d'aide - accessible à tout utilisateur authentifié, pas
            de garde de capacité ; la visibilité par article se fait via
            visibleArticles()/getVisibleArticleBySlug() (Phase 10.3). */}
      <Route path="/aide" element={<AidePage />} />
      <Route path="/aide/:slug" element={<AideArticlePage />} />

      <Route
        path="/utilisateurs"
        element={
          <CapabilityRoute capability="USER_MANAGE">
            <AdminUsersPage />
          </CapabilityRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <CapabilityRoute capability="SYSTEM_SETTINGS_VIEW">
            <AdminPage />
          </CapabilityRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <CapabilityRoute capability="AUDIT_VIEW">
            <AuditPage />
          </CapabilityRoute>
        }
      />
    </Route>

    {/* ── Redirections - atterrissage selon le rôle (lib/landing.ts) ── */}
    <Route path="/" element={<LandingRedirect />} />
    <Route path="*" element={<LandingRedirect />} />

    {/* ── Portail documentaire ───────────────────────────────────── */}
    <Route path="/portal" element={<PortailPage />} />
    <Route path="/portal/telecharger/:token" element={<PortailTelechargerPage />} />
  </Route>
);
