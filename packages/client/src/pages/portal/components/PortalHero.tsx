// packages/client/src/pages/portal/components/PortalHero.tsx
// Contenu seul — l'habillage (bande navy, largeur, disposition avec
// PortalInfoCard + la recherche) vit dans PortalPage. Compact
// délibérément — hauteur de bande inchangée, le sceau ANAC renforce
// l'identité sans dominer le titre (§6-7 du brief de raffinement).
export function PortalHero() {
  return (
    <div className="flex gap-4">
      <img
        src="/anac-seal.png"
        alt="ANAC Gabon"
        width={64}
        height={64}
        className="h-14 w-14 lg:h-20 lg:w-20 object-contain rounded-full"
      />

      <div className="flex flex-col">
        <h1 className="text-[26px] leading-tight font-bold">
          Bienvenue sur le portail documentaire SICOT
        </h1>
        <p className="text-white/70 text-sm mt-2 max-w-lg">
          Consultez les documents publiés et autorisés pour diffusion externe par l&apos;ANAC Gabon.
        </p>
        <p className="text-white/50 text-xs mt-1.5">Aucun compte SICOT n&apos;est requis.</p>
      </div>
    </div>
  );
}
