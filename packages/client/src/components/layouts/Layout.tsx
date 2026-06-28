import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../lib/auth.api';

// ── Types ─────────────────────────────────────────────────────────────────
interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
  roles?: string[]; // si défini, visible uniquement pour ces rôles
}

// ── Items de navigation ───────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: '📊' },
  { to: '/accords', labelKey: 'nav.accords', icon: '📋' },
  { to: '/partenaires', labelKey: 'nav.partenaires', icon: '🤝' },
  { to: '/missions', labelKey: 'nav.missions', icon: '✈️' },
  { to: '/courriers', labelKey: 'nav.courriers', icon: '✉️' },
  { to: '/traductions', labelKey: 'nav.traductions', icon: '🌐' },
  { to: '/demandes', labelKey: 'nav.demandes', icon: '📥' },
  { to: '/glossaire', labelKey: 'nav.glossaire', icon: '📖' },
  { to: '/documents', labelKey: 'nav.documents', icon: '🗂️' },
  {
    to: '/admin',
    labelKey: 'nav.administration',
    icon: '⚙️',
    roles: ['admin', 'super_admin'],
  },
  {
    to: '/audit',
    labelKey: 'nav.audit',
    icon: '🔍',
    roles: ['admin', 'super_admin'],
  },
];

// ── Hook pour récupérer l'utilisateur connecté depuis le contexte ─────────
// On le passera via props pour l'instant — on ajoutera un contexte Auth
// dans le prochain fichier
interface LayoutProps {
  userRole?: string;
  userNom?: string;
  userPrenom?: string;
}

// ── Composant principal ───────────────────────────────────────────────────
export default function Layout({ userRole, userNom, userPrenom }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOuverte, setSidebarOuverte] = useState(true);
  const [chargementLogout, setChargementLogout] = useState(false);

  // Filtrer les items de nav selon le rôle de l'utilisateur
  const itemsVisibles = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true; // visible par tous
    return userRole ? item.roles.includes(userRole) : false;
  });

  async function handleLogout() {
    setChargementLogout(true);
    try {
      await authApi.logout();
    } finally {
      navigate('/login');
    }
  }

  function toggleLangue() {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr');
  }

  return (
    <div className="flex h-screen bg-anac-gray overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col bg-anac-navy transition-all duration-300 
                    ${sidebarOuverte ? 'w-56' : 'w-14'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-anac-blue">
          <div
            className="flex-shrink-0 bg-white rounded-full w-8 h-8
                          flex items-center justify-center"
          >
            <span className="text-anac-navy font-bold text-xs">AN</span>
          </div>
          {sidebarOuverte && (
            <div>
              <p className="text-white font-bold text-sm leading-tight">SICOT</p>
              <p className="text-anac-sky text-xs">ANAC Gabon</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {itemsVisibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm
                 transition-colors group
                 ${
                   isActive
                     ? 'bg-anac-blue text-white'
                     : 'text-anac-sky hover:bg-anac-blue/50 hover:text-white'
                 }`
              }
              title={!sidebarOuverte ? t(item.labelKey) : undefined}
            >
              <span className="flex-shrink-0 text-base">{item.icon}</span>
              {sidebarOuverte && <span className="truncate">{t(item.labelKey)}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOuverte(!sidebarOuverte)}
          className="flex items-center justify-center py-3 border-t border-anac-blue
                     text-anac-sky hover:text-white hover:bg-anac-blue/50
                     transition-colors text-sm"
          title={sidebarOuverte ? 'Réduire' : 'Agrandir'}
        >
          {sidebarOuverte ? '◀' : '▶'}
        </button>
      </aside>

      {/* ── Contenu principal ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header
          className="bg-white border-b border-anac-border
                           flex items-center justify-between px-6 py-3 flex-shrink-0"
        >
          {/* Titre de la page — injecté par chaque page via document.title */}
          <h1 className="text-anac-navy font-semibold text-base">
            Système Intégré de Coopération Internationale et de Traduction
          </h1>

          {/* Actions header */}
          <div className="flex items-center gap-4">
            {/* Toggle langue FR/EN */}
            <button
              onClick={toggleLangue}
              className="text-sm text-anac-muted hover:text-anac-navy
                         border border-anac-border rounded px-2 py-1
                         transition-colors font-medium"
            >
              {i18n.language === 'fr' ? 'EN' : 'FR'}
            </button>

            {/* Utilisateur connecté */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-anac-navy">
                  {userPrenom} {userNom}
                </p>
                <p className="text-xs text-anac-muted capitalize">{userRole}</p>
              </div>

              {/* Avatar */}
              <div
                className="bg-anac-navy text-white rounded-full w-8 h-8
                              flex items-center justify-center text-xs font-bold
                              flex-shrink-0"
              >
                {userPrenom?.[0]}
                {userNom?.[0]}
              </div>
            </div>

            {/* Déconnexion */}
            <button
              onClick={handleLogout}
              disabled={chargementLogout}
              className="btn-secondary text-sm py-1.5"
            >
              {chargementLogout ? '...' : t('auth.deconnexion')}
            </button>
          </div>
        </header>

        {/* Zone de contenu — chaque page s'y affiche via <Outlet /> */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
