import { Routes, Route, Navigate } from 'react-router-dom';

// Pages (à implémenter au fil des sprints)
// import LoginPage from './pages/LoginPage';
// import DashboardPage from './pages/DashboardPage';
// import AccordsPage from './pages/AccordsPage';
// import PartenairesPage from './pages/PartenairesPage';
// import MissionsPage from './pages/MissionsPage';
// import CourriersPage from './pages/CourriersPage';
// import TraductionsPage from './pages/TraductionsPage';
// import DemandesPage from './pages/DemandesPage';
// import GlossairePage from './pages/GlossairePage';
// import DocumentsPage from './pages/DocumentsPage';
// import AdminPage from './pages/AdminPage';
// import AuditPage from './pages/AuditPage';

// Placeholder jusqu'au Sprint 1
function ComingSoon({ module }: { module: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-anac-navy">{module}</h2>
        <p className="text-anac-muted mt-2">En cours de développement…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<ComingSoon module="Connexion" />} />

      {/* Modules */}
      <Route path="/dashboard" element={<ComingSoon module="Tableau de bord" />} />
      <Route path="/accords/*" element={<ComingSoon module="Accords & Partenariats" />} />
      <Route path="/partenaires/*" element={<ComingSoon module="Partenaires Internationaux" />} />
      <Route path="/missions/*" element={<ComingSoon module="Missions & Événements" />} />
      <Route path="/courriers/*" element={<ComingSoon module="Correspondances" />} />
      <Route path="/traductions/*" element={<ComingSoon module="Traduction IA" />} />
      <Route path="/demandes/*" element={<ComingSoon module="Demandes de Traduction" />} />
      <Route path="/glossaire/*" element={<ComingSoon module="Glossaire" />} />
      <Route path="/documents/*" element={<ComingSoon module="Gestion Documentaire" />} />
      <Route path="/admin/*" element={<ComingSoon module="Administration" />} />
      <Route path="/audit" element={<ComingSoon module="Journal d'audit" />} />

      {/* Redirect racine */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
