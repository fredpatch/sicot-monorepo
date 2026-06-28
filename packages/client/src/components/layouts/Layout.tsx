import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Globe2,
  Plane,
  Mail,
  Languages,
  Inbox,
  BookOpen,
  FolderOpen,
  Settings2,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { authApi } from '../../lib/auth.api';

// ── Types ─────────────────────────────────────────────────────────────────
interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  roles?: string[];
}

// ── Items de navigation ───────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/accords', labelKey: 'nav.accords', icon: FileText },
  { to: '/partenaires', labelKey: 'nav.partenaires', icon: Globe2 },
  { to: '/missions', labelKey: 'nav.missions', icon: Plane },
  { to: '/courriers', labelKey: 'nav.courriers', icon: Mail },
  { to: '/traductions', labelKey: 'nav.traductions', icon: Languages },
  { to: '/demandes', labelKey: 'nav.demandes', icon: Inbox },
  { to: '/glossaire', labelKey: 'nav.glossaire', icon: BookOpen },
  { to: '/documents', labelKey: 'nav.documents', icon: FolderOpen },
  {
    to: '/admin',
    labelKey: 'nav.administration',
    icon: Settings2,
    roles: ['admin', 'super_admin'],
  },
  {
    to: '/audit',
    labelKey: 'nav.audit',
    icon: ClipboardList,
    roles: ['admin', 'super_admin'],
  },
];

// ── Props ─────────────────────────────────────────────────────────────────
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
    if (!item.roles) return true;
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

  const initiales = `${userPrenom?.[0] ?? ''}${userNom?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex h-screen bg-anac-gray overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: sidebarOuverte ? 224 : 45 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col bg-anac-navy overflow-hidden flex-shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-white/10 h-[57px] overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={15} className="text-white" strokeWidth={1.75} />
          </div>
          <div
            className={cn(
              'overflow-hidden whitespace-nowrap transition-opacity duration-200',
              sidebarOuverte ? 'opacity-100' : 'opacity-0'
            )}
          >
            <p className="text-white font-bold text-sm leading-tight">SICOT</p>
            <p className="text-anac-sky text-[10px] leading-tight">ANAC Gabon</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {itemsVisibles.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={!sidebarOuverte ? t(item.labelKey) : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-2.5 py-[7px] rounded-md transition-colors overflow-hidden',
                    isActive
                      ? 'bg-anac-blue text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <Icon size={15} className="flex-shrink-0" strokeWidth={1.75} />
                <span
                  className={cn(
                    'text-[12px] font-medium truncate whitespace-nowrap transition-opacity duration-150',
                    sidebarOuverte ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOuverte(!sidebarOuverte)}
          className="flex items-center justify-center h-10 border-t border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label={sidebarOuverte ? 'Réduire la barre latérale' : 'Agrandir la barre latérale'}
        >
          {sidebarOuverte ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </motion.aside>

      {/* ── Contenu principal ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-anac-border flex items-center justify-between px-6 h-[57px] flex-shrink-0">
          <h1 className="text-anac-navy font-semibold text-sm truncate">
            Système Intégré de Coopération Internationale et de Traduction
          </h1>

          <div className="flex items-center gap-1 flex-shrink-0 ml-4">
            {/* Toggle langue FR/EN */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLangue}
              className="h-8 px-2.5 text-anac-muted hover:text-anac-navy font-bold text-[11px] tracking-wide"
            >
              {i18n.language === 'fr' ? 'EN' : 'FR'}
            </Button>

            <div className="w-px h-5 bg-anac-border mx-1" />

            {/* Utilisateur connecté */}
            <div className="flex items-center gap-2.5 px-1.5">
              <div className="text-right">
                <p className="text-[12px] font-semibold text-anac-navy leading-tight">
                  {userPrenom} {userNom}
                </p>
                <p className="text-[10px] text-anac-muted capitalize leading-tight">{userRole}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-anac-navy text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 select-none">
                {initiales || '—'}
              </div>
            </div>

            <div className="w-px h-5 bg-anac-border mx-1" />

            {/* Déconnexion */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={chargementLogout}
              className="h-8 px-2.5 gap-1.5 text-anac-muted hover:text-anac-danger hover:bg-red-50"
            >
              {chargementLogout ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <LogOut size={13} />
              )}
              <span className="text-[11px]">{t('auth.deconnexion')}</span>
            </Button>
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
