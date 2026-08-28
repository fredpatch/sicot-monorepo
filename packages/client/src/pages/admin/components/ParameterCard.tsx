// packages/client/src/pages/admin/components/ParameterCard.tsx
import { useId, useState } from 'react';
import { AlertTriangle, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PARAMETRE_LABELS, PARAMETRES_A_EFFET_DIFFERE } from '../admin.constants';
import { uniteDepuisCle } from '../admin.utils';
import type { Parametre } from '../admin.types';

interface ParameterCardProps {
  parametre: Parametre;
  peutModifier: boolean;
  onSave: (cle: string, valeur: string) => void;
  saving: boolean;
  succes: boolean;
  deeplNonConfigure?: boolean;
}

export function ParameterCard({
  parametre,
  peutModifier,
  onSave,
  saving,
  succes,
  deeplNonConfigure,
}: ParameterCardProps) {
  const inputId = useId();
  const [valeur, setValeur] = useState(parametre.valeur);
  const [modifie, setModifie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const unite = uniteDepuisCle(parametre.cle);
  const effetDiffere = PARAMETRES_A_EFFET_DIFFERE[parametre.cle];

  function handleChange(v: string) {
    setValeur(v);
    setModifie(v !== parametre.valeur);
    setErreur(null);
  }

  function handleSave() {
    if (parametre.type === 'entier' && !/^\d+$/.test(valeur)) {
      setErreur('Doit être un nombre entier positif.');
      return;
    }
    onSave(parametre.cle, valeur);
    setModifie(false);
  }

  return (
    <div className="card flex h-full flex-col gap-2.5 p-3.5">
      <div>
        <label htmlFor={inputId} className="text-sm font-semibold leading-snug text-anac-navy">
          {PARAMETRE_LABELS[parametre.cle] ?? parametre.cle}
        </label>
        {parametre.description && (
          <p className="mt-0.5 text-xs leading-snug text-anac-muted">{parametre.description}</p>
        )}
        {deeplNonConfigure && (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-orange-600">
            <AlertTriangle size={11} className="shrink-0" />
            Activé mais DEEPL_API_KEY absent sur le microservice - le fallback échouera
            silencieusement
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        {!peutModifier ? (
          <span className="input flex h-8 flex-1 items-center bg-anac-gray/60 text-sm text-anac-muted">
            {parametre.type === 'booleen' ? (valeur === 'true' ? 'Activé' : 'Désactivé') : valeur}
            {unite && ` ${unite}`}
          </span>
        ) : parametre.type === 'booleen' ? (
          <select
            id={inputId}
            value={valeur}
            onChange={(e) => handleChange(e.target.value)}
            className="input h-8 flex-1 text-sm"
          >
            <option value="true">Activé</option>
            <option value="false">Désactivé</option>
          </select>
        ) : parametre.type === 'entier' ? (
          <div className="flex flex-1 items-center gap-1.5">
            <Input
              id={inputId}
              type="number"
              min={0}
              value={valeur}
              onChange={(e) => handleChange(e.target.value)}
              className="h-8 w-full text-right text-sm"
            />
            {unite && <span className="shrink-0 text-xs text-anac-muted">{unite}</span>}
          </div>
        ) : (
          <Input
            id={inputId}
            type="text"
            value={valeur}
            onChange={(e) => handleChange(e.target.value)}
            className="h-8 flex-1 text-sm"
          />
        )}

        {peutModifier && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!modifie || saving}
            aria-label="Enregistrer"
            className="h-8 shrink-0 px-2.5 gap-1"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-anac-muted/70">{parametre.cle}</span>
        {!peutModifier ? (
          <span className="text-[10px] font-medium text-anac-muted">Réservé Super Admin</span>
        ) : succes ? (
          <span className="text-[10px] font-medium text-green-600">✓ Enregistré</span>
        ) : null}
      </div>

      {erreur && <p className="text-[11px] text-anac-danger">{erreur}</p>}
      {effetDiffere && peutModifier && (
        <p className="text-[10px] leading-snug text-anac-muted/80">{effetDiffere}</p>
      )}
    </div>
  );
}
