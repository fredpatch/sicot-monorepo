import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { authApi } from './lib/auth.api';
import Layout from './components/layouts/Layout';
import LoginPage from './pages/LoginPage';
import DocumentsPage from './pages/DocumentsPage';
import PartenairesPage from './pages/PartenairesPage';
import BootstrapPage from './pages/BootstrapPage';
import axios from 'axios';
import AccordsPage from './pages/AccordsPage';
import AccordFormPage from './pages/accords/components/AccordFormPage';
import CourriersPage from './pages/CourriersPage';
import CourrierFormPage from './pages/courriers/components/CourrierFormPage';

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

// ── Route réservée aux admins ─────────────────────────────────────────────
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── Route bootstrap — redirige si déjà initialisé ────────────────────────
function BootstrapRoute({ bootstrapNeeded }: { bootstrapNeeded: boolean }) {
  if (!bootstrapNeeded) {
    return <Navigate to="/login" replace />;
  }
  return <BootstrapPage />;
}

// ── Composant racine ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [chargement, setChargement] = useState(true);
  const [bootstrapNeeded, setBootstrapNeeded] = useState(false);

  useEffect(() => {
    async function verifierSession() {
      try {
        // 1. Vérifier si le système est initialisé
        const bootstrapRes = await axios.get('/api/bootstrap/status');
        if (!bootstrapRes.data.initialise) {
          setBootstrapNeeded(true);
          setChargement(false);
          return;
        }

        // 2. Vérifier la session existante
        const response = await authApi.me();
        setUser(response.data);
      } catch {
        setUser(null);
      } finally {
        setChargement(false);
      }
    }

    verifierSession();
  }, []);

  // Écran de chargement initial — avant même de savoir si bootstrap est nécessaire
  if (chargement) {
    return (
      <div className="min-h-screen bg-anac-gray flex items-center justify-center">
        <div className="text-center space-y-3">
          <div
            className="bg-anac-navy inline-flex items-center justify-center
                          w-12 h-12 rounded-full"
          >
            <span className="text-white font-bold text-sm">AN</span>
          </div>
          <p className="text-anac-muted text-sm">Chargement de SICOT...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, chargement }}>
      <Routes>
        {/* ── Bootstrap — premier démarrage ─────────────────────────── */}
        <Route path="/bootstrap" element={<BootstrapRoute bootstrapNeeded={bootstrapNeeded} />} />

        {/* ── Redirection automatique si bootstrap nécessaire ───────── */}
        {bootstrapNeeded && <Route path="*" element={<Navigate to="/bootstrap" replace />} />}

        {/* ── Routes publiques ──────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Routes protégées dans le Layout ───────────────────────── */}
        <Route
          element={
            <ProtectedRoute>
              <Layout userRole={user?.role} userNom={user?.nom} userPrenom={user?.prenom} />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<ComingSoon module="Tableau de bord" />} />
          <Route path="/accords" element={<AccordsPage />} />
          <Route path="/accords/:id" element={<AccordsPage />} />
          <Route path="/accords/new" element={<AccordFormPage />} />
          <Route path="/accords/:id/edit" element={<AccordFormPage />} />
          <Route path="/partenaires/*" element={<PartenairesPage />} />
          <Route path="/missions/*" element={<ComingSoon module="Missions & Événements" />} />
          <Route path="/courriers" element={<CourriersPage />} />
          <Route path="/courriers/:id" element={<CourriersPage />} />
          <Route path="/courriers/new" element={<CourrierFormPage />} />
          <Route path="/courriers/:id/edit" element={<CourrierFormPage />} />
          <Route path="/traductions/*" element={<ComingSoon module="Traduction IA" />} />
          <Route path="/demandes/*" element={<ComingSoon module="Demandes de Traduction" />} />
          <Route path="/glossaire/*" element={<ComingSoon module="Glossaire" />} />
          <Route path="/documents/*" element={<DocumentsPage />} />

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

        {/* ── Redirections ──────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
