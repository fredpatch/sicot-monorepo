import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Loader2, Upload, User, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { documentsApi } from '@/lib/documents.api';
import { missionsApi } from '@/lib/missions.api';
import { useAuth } from '@/App';
import type { Mission } from '../mission.types';
import { isMissionReportMissing } from '../mission.utils';
import { canManageMission } from '../missions.permissions';

const AUCUN_RESPONSABLE = '__aucun__';

// Assignation du participant responsable du rapport officiel (Phase 8) -
// MISSION_MANAGE uniquement (cette section entière n'est atteignable que
// via /missions/:id, déjà gardé MISSION_REGISTRY_VIEW côté routeur). Ne
// peut désigner qu'un participant réel de la mission - validé aussi côté
// serveur (missions.service.ts), ce select ne fait que refléter cette
// contrainte pour éviter un aller-retour 400 évitable.
function ReportResponsableAssignment({ mission }: { mission: Mission }) {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: (rapportResponsableId: number | null) =>
      missionsApi.mettreAJour(mission.id, { rapportResponsableId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', mission.id] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border border-anac-border bg-anac-gray/40 px-4 py-3">
      <User size={16} className="shrink-0 text-anac-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-anac-muted">Responsable du rapport</p>
        <p className="text-xs text-anac-muted">
          Seul ce participant peut déposer/remplacer le rapport depuis « Mes missions ».
        </p>
      </div>
      <Select
        value={
          mission.rapportResponsableId ? String(mission.rapportResponsableId) : AUCUN_RESPONSABLE
        }
        onValueChange={(value) =>
          assignMutation.mutate(value === AUCUN_RESPONSABLE ? null : Number(value))
        }
        disabled={assignMutation.isPending || mission.participants.length === 0}
      >
        <SelectTrigger className="h-8 w-48 shrink-0 text-xs">
          <SelectValue placeholder="Aucun responsable" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUCUN_RESPONSABLE}>Aucun responsable</SelectItem>
          {mission.participants.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.prenom} {p.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface DocumentSummary {
  id: number;
  nomOriginal: string;
  mimeType: string;
  createdAt?: string;
}

// Preserves both existing behaviors - upload a new file, or link an
// existing mission document - as their own workflow, out of the general
// edit form per the Phase 2 plan (§6).
export function MissionReportSection({ mission }: { mission: Mission }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'existing'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const peutGerer = canManageMission(user);

  const reportQuery = useQuery({
    queryKey: ['document', mission.rapportDocumentId],
    queryFn: async () => {
      const res = await documentsApi.getById(mission.rapportDocumentId!);
      return res.data as DocumentSummary;
    },
    enabled: Boolean(mission.rapportDocumentId),
  });

  const existingDocsQuery = useQuery({
    queryKey: ['documents-missions'],
    queryFn: async () => {
      const res = await documentsApi.lister({ categorie: 'mission', pageSize: 100 });
      return res.data as { data: DocumentSummary[] };
    },
    enabled: mode === 'existing' && !mission.rapportDocumentId,
  });

  const linkMutation = useMutation({
    mutationFn: (documentId: number) =>
      missionsApi.mettreAJour(mission.id, { rapportDocumentId: documentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', mission.id] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-aggregates'] });
    },
  });

  // Explicit null - distinct from omitting the field - actually clears the
  // link server-side, letting a mistakenly-uploaded report be replaced.
  const unlinkMutation = useMutation({
    mutationFn: () => missionsApi.mettreAJour(mission.id, { rapportDocumentId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', mission.id] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-aggregates'] });
    },
  });

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await documentsApi.upload(file, 'mission');
      const { document } = res.data as { document: DocumentSummary; doublon?: boolean };
      await linkMutation.mutateAsync(document.id);
    } catch {
      setUploadError("Erreur lors de l'upload. Vérifiez le fichier et réessayez.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (mission.rapportDocumentId) {
    return (
      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Rapport de mission</h3>
        {peutGerer && (
          <div className="mt-4">
            <ReportResponsableAssignment mission={mission} />
          </div>
        )}
        {reportQuery.isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-anac-muted">
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            Chargement...
          </div>
        ) : reportQuery.data ? (
          <div className="mt-4 flex items-center justify-between rounded-md border border-anac-border p-4">
            <span className="flex items-center gap-3">
              <FileText size={18} className="text-anac-blue" aria-hidden="true" />
              <span>
                <span className="block font-semibold text-anac-navy">
                  {reportQuery.data.nomOriginal}
                </span>
                <span className="text-xs text-anac-muted">{reportQuery.data.mimeType}</span>
              </span>
            </span>
            <span className="flex items-center gap-3">
              <a
                href={documentsApi.getUrlTelechargement(reportQuery.data.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-anac-blue"
              >
                <ExternalLink size={16} aria-label="Ouvrir le rapport" />
              </a>
              {peutGerer && (
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      await confirm({
                        title: 'Retirer ce rapport ?',
                        description: 'Vous pourrez ensuite en déposer un autre.',
                        confirmLabel: 'Retirer',
                        variant: 'destructive',
                      })
                    ) {
                      unlinkMutation.mutate();
                    }
                  }}
                  disabled={unlinkMutation.isPending}
                  className="text-anac-muted hover:text-anac-danger disabled:opacity-50"
                  aria-label="Retirer le rapport"
                >
                  {unlinkMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <X size={16} aria-hidden="true" />
                  )}
                </button>
              )}
            </span>
          </div>
        ) : (
          <p className="mt-4 text-sm text-anac-muted">Rapport indisponible.</p>
        )}
      </section>
    );
  }

  return (
    <section className="card p-5">
      <h3 className="font-bold text-anac-navy">Rapport de mission</h3>
      {isMissionReportMissing(mission) && (
        <p className="mt-1 text-sm font-medium text-anac-warning">
          Mission terminée - rapport non déposé.
        </p>
      )}

      {peutGerer && (
        <>
          <div className="mt-4">
            <ReportResponsableAssignment mission={mission} />
          </div>

          <div className="mt-4 inline-flex rounded-md border border-anac-border bg-white p-1">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`rounded px-3 py-1.5 text-sm font-medium ${mode === 'upload' ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted'}`}
            >
              Nouveau fichier
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`rounded px-3 py-1.5 text-sm font-medium ${mode === 'existing' ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted'}`}
            >
              Document existant
            </button>
          </div>

          {mode === 'upload' ? (
            <div className="mt-4 rounded-md border border-dashed border-anac-border px-5 py-8 text-center">
              <Upload size={22} className="mx-auto text-anac-blue" aria-hidden="true" />
              <p className="mt-3 font-semibold text-anac-navy">Déposer le rapport de mission</p>
              <p className="mt-1 text-sm text-anac-muted">PDF, Word, image ou TIFF.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-4 gap-2"
              >
                {uploading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                Choisir un fichier
              </Button>
              {uploadError && <p className="mt-3 text-sm text-anac-danger">{uploadError}</p>}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
                onChange={handleUpload}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-anac-border">
              {existingDocsQuery.isLoading ? (
                <p className="px-4 py-6 text-center text-sm text-anac-muted">Chargement...</p>
              ) : existingDocsQuery.data?.data.length ? (
                <div className="max-h-72 divide-y divide-anac-border overflow-y-auto">
                  {existingDocsQuery.data.data.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => linkMutation.mutate(doc.id)}
                      disabled={linkMutation.isPending}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-anac-gray"
                    >
                      <FileText size={16} className="text-anac-muted" aria-hidden="true" />
                      <span className="font-medium text-anac-navy">{doc.nomOriginal}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-anac-muted">
                  Aucun document de type Mission disponible.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
