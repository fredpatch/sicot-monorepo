// packages/client/src/pages/portal/PortalDownloadPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, Loader2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { portalApi } from '@/lib/portal.api';
import { PortalHeader } from './components/PortalHeader';
import { PortalFooter } from './components/PortalFooter';

type Etat = 'en_cours' | 'succes' | 'erreur';

// Cible réelle du lien envoyé par email (portal.service.ts#genererTokenTelechargement) —
// route absente jusqu'ici, ce qui rendait tout le flux de téléchargement
// sécurisé non fonctionnel (le lien retombait sur la redirection générique
// de connexion). Récupère le fichier en blob plutôt qu'une navigation
// directe vers l'API, pour pouvoir afficher un état d'erreur normalisé
// (lien expiré/invalide, §30 du brief) au lieu du JSON brut du serveur.
export default function PortalDownloadPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [etat, setEtat] = useState<Etat>('en_cours');
  const [message, setMessage] = useState<string | null>(null);
  const [nomFichier, setNomFichier] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setEtat('erreur');
      setMessage('Lien de téléchargement invalide.');
      return;
    }

    let annule = false;

    async function telecharger() {
      try {
        const res = await portalApi.telechargerAvecToken(token!);
        if (annule) return;

        const dispositionEnTete = res.headers['content-disposition'] as string | undefined;
        const correspondance = dispositionEnTete?.match(/filename="?([^"]+)"?/);
        const nom = correspondance ? decodeURIComponent(correspondance[1]) : 'document';
        setNomFichier(nom);

        const url = URL.createObjectURL(res.data as Blob);
        const lien = window.document.createElement('a');
        lien.href = url;
        lien.download = nom;
        window.document.body.appendChild(lien);
        lien.click();
        lien.remove();
        URL.revokeObjectURL(url);

        setEtat('succes');
      } catch (err) {
        if (annule) return;
        const status = (err as { response?: { status?: number; data?: Blob } })?.response
          ?.status;
        if (status === 410) {
          setMessage(
            "Ce lien de téléchargement n'est plus valide. Veuillez retourner sur le portail et demander un nouveau lien."
          );
        } else if (status === 404) {
          setMessage('Ce lien de téléchargement est introuvable ou incorrect.');
        } else {
          setMessage('Une erreur est survenue lors du téléchargement.');
        }
        setEtat('erreur');
      }
    }

    telecharger();
    return () => {
      annule = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-anac-gray flex flex-col">
      <PortalHeader />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full bg-white border border-anac-border rounded-xl p-8 text-center">
          {etat === 'en_cours' && (
            <>
              <Loader2 size={28} className="animate-spin text-anac-sky mx-auto mb-4" />
              <p className="text-sm font-medium text-anac-navy">Préparation du téléchargement…</p>
            </>
          )}

          {etat === 'succes' && (
            <>
              <CheckCircle2 size={32} className="text-green-600 mx-auto mb-4" />
              <p className="text-sm font-medium text-anac-navy">Téléchargement lancé</p>
              {nomFichier && (
                <p className="text-xs text-anac-muted mt-1">{nomFichier}</p>
              )}
              <p className="text-xs text-anac-muted mt-3">
                Si rien ne se passe, vérifiez les téléchargements bloqués de votre navigateur.
              </p>
              <Button variant="secondary" className="mt-5 gap-1.5" onClick={() => navigate('/portal')}>
                Retourner au portail
              </Button>
            </>
          )}

          {etat === 'erreur' && (
            <>
              <XCircle size={32} className="text-anac-danger mx-auto mb-4" />
              <p className="text-sm font-medium text-anac-navy">Téléchargement impossible</p>
              <p className="text-xs text-anac-muted mt-2">{message}</p>
              <Button className="mt-5 gap-1.5" onClick={() => navigate('/portal')}>
                <Download size={13} /> Retourner au portail
              </Button>
            </>
          )}
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
