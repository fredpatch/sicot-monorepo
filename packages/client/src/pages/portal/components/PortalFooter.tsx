// packages/client/src/pages/portal/components/PortalFooter.tsx
// Minimal délibérément - aucune page Mentions légales/Confidentialité/Contact
// n'existe aujourd'hui ; pas de lien mort (§39 du brief). Bandeau de
// certification (ISO 9001 / Bureau Veritas / UKAS) en zone secondaire
// institutionnelle, asset officiel non modifié.
export function PortalFooter() {
  return (
    <footer className="border-t border-anac-border bg-white mt-auto">
      <div className="max-w-350 mx-auto px-6 lg:px-10 py-6 flex flex-col items-center gap-4 text-center text-xs text-anac-muted">
        <img
          src="/anac-certif.png"
          alt="Certification ISO 9001 - Bureau Veritas, accréditation UKAS"
          className="h-8 w-auto object-contain"
        />
        <div>
          <p className="font-medium text-anac-navy">SICOT - ANAC Gabon</p>
          <p className="mt-0.5">© {new Date().getFullYear()} ANAC Gabon. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
