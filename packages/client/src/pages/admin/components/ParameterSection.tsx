// packages/client/src/pages/admin/components/ParameterSection.tsx
import { ParameterCard } from './ParameterCard';
import type { Parametre } from '../admin.types';

interface ParameterSectionProps {
  label: string;
  parametres: Parametre[];
  peutModifier: boolean;
  cleEnCours: string | null;
  succesCle: string | null;
  saving: boolean;
  onSave: (cle: string, valeur: string) => void;
  deeplConfigure?: boolean;
}

export function ParameterSection({
  label,
  parametres,
  peutModifier,
  cleEnCours,
  succesCle,
  saving,
  onSave,
  deeplConfigure,
}: ParameterSectionProps) {
  return (
    <div className="space-y-3">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-anac-muted">{label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {parametres.map((p) => (
          <ParameterCard
            key={p.cle}
            parametre={p}
            peutModifier={peutModifier}
            onSave={onSave}
            saving={cleEnCours === p.cle && saving}
            succes={succesCle === p.cle}
            deeplNonConfigure={p.cle === 'deepl_fallback_actif' && p.valeur === 'true' && deeplConfigure === false}
          />
        ))}
      </div>
    </div>
  );
}
