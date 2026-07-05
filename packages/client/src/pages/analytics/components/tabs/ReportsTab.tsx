// packages/client/src/pages/analytics/onglets/OngletRapports.tsx
import { useState } from 'react';
import { FileDown, Loader2, LoaderIcon, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { documentsApi } from '@/lib/documents.api';
import { useAuth } from '@/App';

import { useRapportsHistoriqueQuery } from '../../hooks/queries';
import { useAnalyticsRapportsMutations } from '../../hooks/mutations';
import { MODULES_DISPONIBLES } from '../../analytics.constants';
import { BadgeAnalyseIA } from '../../components/AIAnalysisBadge';
import { AnalyseIADialog } from '../../components/AnalyticsAIDialog';
import type { RapportHistorique } from '../../analytics.types';

export function OngletRapports() {
  const [modulesChoisis, setModulesChoisis] = useState<string[]>(
    MODULES_DISPONIBLES.map((m) => m.cle)
  );
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [periodeDebut, setPeriodeDebut] = useState('');
  const [periodeFin, setPeriodeFin] = useState('');

  // On ne montre l'onglet "Rapports" qu'aux admins et super-admins, car il permet de générer des rapports globaux.
  const { user } = useAuth();
  const estAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [rapportEnRevue, setRapportEnRevue] = useState<RapportHistorique | null>(null);
  const [texteEdite, setTexteEdite] = useState('');

  const { data: historique, isLoading: chargementHistorique } = useRapportsHistoriqueQuery();
  const { genererIA, validerIA, generation } = useAnalyticsRapportsMutations({
    texteEdite,
    onRapportValide: () => setRapportEnRevue(null),
  });

  function ouvrirRevue(r: RapportHistorique) {
    setTexteEdite(r.contenuIA ?? '');
    setRapportEnRevue(r);
  }

  function toggleModule(cle: string) {
    setModulesChoisis((prev) =>
      prev.includes(cle) ? prev.filter((m) => m !== cle) : [...prev, cle]
    );
  }

  const formulaireValide = periodeDebut !== '' && periodeFin !== '' && modulesChoisis.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Générer un rapport à la demande ──────────────────────────── */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-anac-navy mb-0.5">Générer un rapport</p>
        <p className="text-xs text-anac-muted mb-4">
          Sélectionnez la période, les modules à inclure, et le format. Le rapport est archivé
          automatiquement dans la Gestion Documentaire (catégorie « Rapport »).
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-anac-muted block mb-1.5">Période</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={periodeDebut}
                onChange={(e) => setPeriodeDebut(e.target.value)}
                className="input h-9 text-sm w-36"
              />
              <span className="text-anac-muted text-sm">au</span>
              <input
                type="date"
                value={periodeFin}
                onChange={(e) => setPeriodeFin(e.target.value)}
                className="input h-9 text-sm w-36"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-anac-muted block mb-1.5">Modules inclus</label>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {MODULES_DISPONIBLES.map((m) => (
                <label
                  key={m.cle}
                  className="flex items-center gap-1.5 text-sm text-anac-text cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={modulesChoisis.includes(m.cle)}
                    onChange={() => toggleModule(m.cle)}
                    className="rounded border-anac-border"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-anac-muted block mb-1.5">Format</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-anac-text cursor-pointer">
                <input type="radio" checked={format === 'pdf'} onChange={() => setFormat('pdf')} />
                PDF
              </label>
              <label className="flex items-center gap-1.5 text-sm text-anac-text cursor-pointer">
                <input
                  type="radio"
                  checked={format === 'excel'}
                  onChange={() => setFormat('excel')}
                />
                Excel
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            size="sm"
            disabled={!formulaireValide || generation.isPending}
            onClick={() =>
              generation.mutate({ periodeDebut, periodeFin, modules: modulesChoisis, format })
            }
            className="gap-1.5"
          >
            {generation.isPending ? (
              <LoaderIcon size={13} className="animate-spin" />
            ) : (
              <FileDown size={13} />
            )}
            Générer le rapport
          </Button>
          {generation.isSuccess && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-anac-succes font-medium">
                ✓ Rapport généré - disponible ci-dessous et dans la Gestion Documentaire
              </span>
              {estAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  disabled={genererIA.isPending}
                  onClick={() => generation.data && genererIA.mutate(generation.data.rapportId)}
                >
                  <Sparkles size={11} /> Générer l&apos;analyse IA pour ce rapport
                </Button>
              )}
            </div>
          )}
          {generation.isError && (
            <span className="text-xs text-anac-danger">Échec de la génération - réessayez</span>
          )}
        </div>
      </div>

      {/* ── Historique ────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Historique des rapports</p>
          <p className="text-xs text-anac-muted">
            Rapports générés automatiquement (1er du mois) ou à la demande.
          </p>
        </div>
        {chargementHistorique ? (
          <div className="text-center py-8 text-anac-muted">
            <Loader2 size={16} className="animate-spin inline mr-2" />
            Chargement...
          </div>
        ) : !historique || historique.length === 0 ? (
          <p className="text-sm text-anac-muted text-center py-8">
            Aucun rapport généré pour le moment
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Généré le</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Analyse IA</TableHead>
                <TableHead>Période couverte</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Fichier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historique.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-anac-text whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <span className={r.type === 'mensuel' ? 'badge-info' : 'badge-neutre'}>
                      {r.type === 'mensuel' ? 'Mensuel auto' : 'À la demande'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {r.statutRelectureIA === 'non_applicable' ? (
                      estAdmin ? (
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            disabled={genererIA.isPending}
                            onClick={() => genererIA.mutate(r.id)}
                          >
                            <Sparkles size={11} /> Générer
                          </Button>
                          {genererIA.isError && genererIA.variables === r.id && (
                            <span className="text-[10px] text-anac-danger">
                              {(genererIA.error as { response?: { data?: { message?: string } } })
                                ?.response?.data?.message ?? 'Échec - réessayez'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-anac-muted">-</span>
                      )
                    ) : r.statutRelectureIA === 'rejete' && estAdmin ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => ouvrirRevue(r)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <BadgeAnalyseIA rapport={r} />
                        </button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={genererIA.isPending}
                          onClick={() => genererIA.mutate(r.id)}
                        >
                          <Sparkles size={11} /> Régénérer
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => ouvrirRevue(r)}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <BadgeAnalyseIA rapport={r} />
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-anac-muted whitespace-nowrap">
                    {new Date(r.periodeDebut).toLocaleDateString('fr-FR')} -{' '}
                    {new Date(r.periodeFin).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-anac-muted text-xs">
                    {r.modulesInclus.join(', ')}
                  </TableCell>
                  <TableCell className="uppercase text-xs font-medium text-anac-navy">
                    {r.format}
                  </TableCell>
                  <TableCell>
                    <a
                      href={documentsApi.getUrlTelechargement(r.documentId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-anac-sky hover:text-anac-navy text-xs font-medium inline-flex items-center gap-1"
                    >
                      <FileDown size={12} /> Télécharger
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AnalyseIADialog
        rapport={rapportEnRevue}
        onOpenChange={(open) => !open && setRapportEnRevue(null)}
        estAdmin={estAdmin}
        texteEdite={texteEdite}
        onTexteEditeChange={setTexteEdite}
        onValider={(statut) =>
          rapportEnRevue && validerIA.mutate({ id: rapportEnRevue.id, statut })
        }
        validationEnCours={validerIA.isPending}
      />
    </div>
  );
}
