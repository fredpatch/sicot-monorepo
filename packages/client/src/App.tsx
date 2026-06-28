import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { authApi } from './lib/auth.api';

// Contexte pour partager l'état de l'utilisateur connecté
import Layout from './components/layouts/Layout';

// Pages (à implémenter au fil des sprints)
import LoginPage from './pages/LoginPage';
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

// ── Placeholder pages (à remplacer au fil des sprints) ────────────────────
function ComingSoon({ module }: { module: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-anac-navy">{module}</h2>
        <p className="text-anac-muted mt-2 text-sm">En cours de développement...</p>
      </div>
    </div>
  );
}

// ── Contexte Auth ─────────────────────────────────────────────────────────
// Permet à n'importe quel composant enfant d'accéder à l'utilisateur connecté
interface AuthUser {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  chargement: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  chargement: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

// ── Route protégée ────────────────────────────────────────────────────────
// Redirige vers /login si l'utilisateur n'est pas connecté
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, chargement } = useAuth();

  if (chargement) {
    return (
      <div className="min-h-screen bg-anac-gray flex items-center justify-center">
        <div className="text-anac-muted text-sm">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ── Route réservée aux admins ──────────────────────────────────────────────
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── Composant racine ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [chargement, setChargement] = useState(true);

  // Au chargement de l'app, vérifier si une session existe déjà
  // (cookie valide → /api/auth/me retourne l'utilisateur)
  useEffect(() => {
    async function verifierSession() {
      try {
        const response = await authApi.me();
        setUser(response.data);
      } catch {
        // Pas de session valide — l'utilisateur devra se connecter
        setUser(null);
      } finally {
        setChargement(false);
      }
    }

    verifierSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, chargement }}>
      <Routes>
        {/* ── Route publique ─────────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Routes protégées dans le Layout ───────────────────────── */}
        <Route
          element={
            <ProtectedRoute>
              <Layout userRole={user?.role} userNom={user?.nom} userPrenom={user?.prenom} />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/dashboard" element={<ComingSoon module="Tableau de bord" />} />

          {/* Sprint 2 */}
          <Route path="/accords/*" element={<ComingSoon module="Accords & Partenariats" />} />
          <Route
            path="/partenaires/*"
            element={<ComingSoon module="Partenaires Internationaux" />}
          />
          <Route path="/missions/*" element={<ComingSoon module="Missions & Événements" />} />
          <Route path="/courriers/*" element={<ComingSoon module="Correspondances" />} />
          <Route path="/traductions/*" element={<ComingSoon module="Traduction IA" />} />
          <Route path="/demandes/*" element={<ComingSoon module="Demandes de Traduction" />} />
          <Route path="/glossaire/*" element={<ComingSoon module="Glossaire" />} />
          <Route path="/documents/*" element={<ComingSoon module="Gestion Documentaire" />} />

          {/* Admin uniquement */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <ComingSoon module="Administration" />
              </AdminRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <AdminRoute>
                <ComingSoon module="Journal d'audit" />
              </AdminRoute>
            }
          />
        </Route>

        {/* ── Redirections ───────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
