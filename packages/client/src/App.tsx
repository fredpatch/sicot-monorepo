import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import { authApi } from './lib/auth.api';
import { getLandingRoute } from './lib/landing';
import { Toaster } from './components/ui/sonner';
import { ConfirmDialogProvider } from './components/ui/confirm-dialog';

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
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
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
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── Route réservée aux agents (espace de travail dédié) ───────────────────
export function AgentRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || user.role !== 'agent') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── Route interdite aux agents (ex. /dashboard, hors de leur portée) ──────
export function NonAgentRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role === 'agent') {
    return <Navigate to="/mon-espace" replace />;
  }

  return <>{children}</>;
}

// ── Route réservée à une liste de rôles explicite ─────────────────────────
// Générique — pour tout écran dont l'accès ne se limite pas à "admin" ou
// "agent" (ex. Traductions/Demandes/Glossaire, réservés traducteur et plus).
// Ferme la même faille que AdminRoute/AgentRoute/NonAgentRoute : la barre de
// navigation masquait déjà ces liens par rôle, mais rien n'empêchait d'y
// accéder par URL directe avant l'ajout de ce garde.
export function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={getLandingRoute(user?.role)} replace />;
  }

  return <>{children}</>;
}

// ── Redirection racine — atterrissage selon le rôle (voir lib/landing.ts) ─
export function LandingRedirect() {
  const { user } = useAuth();
  return <Navigate to={getLandingRoute(user?.role)} replace />;
}

// ── Composant racine ──────────────────────────────────────────────────────
// Root element of the data router (see router.tsx) — owns the auth session
// check and the bootstrap redirect, wraps every route via <Outlet />.
export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [chargement, setChargement] = useState(true);
  const [bootstrapNeeded, setBootstrapNeeded] = useState(false);
  const location = useLocation();

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

  // Redirections liées au bootstrap — remplace l'ancienne route catch-all
  // conditionnelle, plus possible avec un data router (arbre de routes statique).
  if (bootstrapNeeded && location.pathname !== '/bootstrap') {
    return <Navigate to="/bootstrap" replace />;
  }
  if (!bootstrapNeeded && location.pathname === '/bootstrap') {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, chargement }}>
      <ConfirmDialogProvider>
        <Toaster />
        <Outlet />
      </ConfirmDialogProvider>
    </AuthContext.Provider>
  );
}
