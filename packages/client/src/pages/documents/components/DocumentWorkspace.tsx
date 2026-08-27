// packages/client/src/pages/documents/components/DocumentWorkspace.tsx
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, FileText, Image as ImageIcon, Loader2, Paperclip } from 'lucide-react';

import type { UserRole } from '@sicot/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { documentsApi } from '@/lib/documents.api';
import { BadgeOCR } from './BadgeOCR';
import { DocumentActionsMenu } from './DocumentActionsMenu';
import { DocumentPortailBadge } from './DocumentPortailBadge';
import { DocumentPreview } from './DocumentPreview';
import { CATEGORIES } from '../documents.constants';
import { formaterLangue, formaterTaille } from '../documents.utils';
import { canManageDocuments, canManagePortail, getDocumentCapabilities } from '../documents.permissions';
import type { Document } from '../documents.types';

function iconePourMime(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText size={20} className="text-red-500" />;
  if (mimeType.startsWith('image/')) return <ImageIcon size={20} className="text-purple-500" />;
  if (mimeType.includes('sheet') || mimeType.includes('excel'))
    return <FileSpreadsheet size={20} className="text-green-600" />;
  return <Paperclip size={20} className="text-anac-muted" />;
}

interface DocumentWorkspaceProps {
  document: Document | null;
  role: UserRole | undefined;
  onOpenChange: (open: boolean) => void;
  onChangerCategorie: (id: number, cat: string) => void;
  onCorrigerOCR: (doc: Document) => void;
  onRetraiterOCR: (id: number) => void;
  retraiterOCREnCours: boolean;
  onTraduire: (doc: Document) => void;
  onSupprimer: (doc: Document) => void;
  supprimerEnCours: boolean;
  onOuvrirPortail: (doc: Document) => void;
  onRetirerPortail: (id: number) => void;
  retirerPortailEnCours: boolean;
  onVerserVersion: (id: number, fichier: File) => void;
  verserVersionEnCours: boolean;
}

// Panneau de travail du document sélectionné — mêmes onglets pour tous les
// rôles (Aperçu/Informations/OCR/Portail), seules les actions de mutation
// sont retirées pour un agent (voir getDocumentCapabilities). Implémenté en
// Dialog+Tabs plutôt qu'un panneau latéral persistant : c'est le seul motif
// « workspace » qui existe déjà dans l'app (RequestWorkspace), aucun
// primitive Sheet/drawer n'y a été introduit à ce jour.
export function DocumentWorkspace({
  document: doc,
  role,
  onOpenChange,
  onChangerCategorie,
  onCorrigerOCR,
  onRetraiterOCR,
  retraiterOCREnCours,
  onTraduire,
  onSupprimer,
  supprimerEnCours,
  onOuvrirPortail,
  onRetirerPortail,
  retirerPortailEnCours,
  onVerserVersion,
  verserVersionEnCours,
}: DocumentWorkspaceProps) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['documents', doc?.id, 'detail'],
    queryFn: async () => {
      const { data } = await documentsApi.getById(doc!.id);
      return data as Document;
    },
    enabled: !!doc,
  });

  if (!doc) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  // Le détail se rafraîchit automatiquement après toute mutation (les
  // mutations invalident la clé ['documents', ...]) — préférer displayDoc
  // partout dans l'affichage évite que le panneau reste figé sur l'état de
  // la ligne au moment du clic (ex. après Relancer OCR ou Publier/Retirer).
  const displayDoc = detail ?? doc;
  const cap = getDocumentCapabilities(role, displayDoc);
  const url = documentsApi.getUrlTelechargement(doc.id);
  const texteExtrait = detail?.texteExtrait ?? '';
  const extraitCourt = texteExtrait.length > 800 ? `${texteExtrait.slice(0, 800)}…` : texteExtrait;

  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {iconePourMime(displayDoc.mimeType)}
              <div>
                <DialogTitle className="text-base">{displayDoc.nomOriginal}</DialogTitle>
                <DialogDescription>
                  {displayDoc.mimeType} ·{' '}
                  {CATEGORIES.find((c) => c.value === displayDoc.categorie)?.label ??
                    displayDoc.categorie}
                </DialogDescription>
              </div>
            </div>
            <BadgeOCR statut={displayDoc.statutOCR} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => window.open(url, '_blank')}>
              Ouvrir
            </Button>
            {cap.canTranslate && (
              <Button size="sm" onClick={() => onTraduire(displayDoc)}>
                Traduire
              </Button>
            )}
            <DocumentActionsMenu
              document={displayDoc}
              capabilities={cap}
              onCorrigerOCR={onCorrigerOCR}
              onRetraiterOCR={onRetraiterOCR}
              retraiterOCREnCours={retraiterOCREnCours}
              onVerserVersion={onVerserVersion}
              verserVersionEnCours={verserVersionEnCours}
              onOuvrirPortail={onOuvrirPortail}
              onRetirerPortail={onRetirerPortail}
              retirerPortailEnCours={retirerPortailEnCours}
              onSupprimer={onSupprimer}
              supprimerEnCours={supprimerEnCours}
            />
          </div>
        </DialogHeader>

        <DialogBody>
          <Tabs defaultValue="apercu">
            <TabsList>
              <TabsTrigger value="apercu">Aperçu</TabsTrigger>
              <TabsTrigger value="informations">Informations</TabsTrigger>
              <TabsTrigger value="ocr">OCR</TabsTrigger>
              <TabsTrigger value="portail">Portail</TabsTrigger>
            </TabsList>

            <TabsContent value="apercu" className="pt-4">
              <DocumentPreview id={doc.id} mimeType={displayDoc.mimeType} url={url} />
            </TabsContent>

            <TabsContent value="informations" className="space-y-3 pt-4 text-sm">
              <dl className="grid grid-cols-[140px_1fr] gap-y-2.5">
                <dt className="text-anac-muted">Nom du fichier</dt>
                <dd className="text-anac-text">{displayDoc.nomOriginal}</dd>

                <dt className="text-anac-muted">Type MIME</dt>
                <dd className="text-anac-text">{displayDoc.mimeType}</dd>

                <dt className="text-anac-muted">Catégorie</dt>
                <dd>
                  {canManageDocuments(role) ? (
                    <Select
                      value={displayDoc.categorie}
                      onValueChange={(cat) => onChangerCategorie(doc.id, cat)}
                    >
                      <SelectTrigger className="h-7 w-44 px-2 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.filter((c) => c.value !== 'tous').map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    CATEGORIES.find((c) => c.value === displayDoc.categorie)?.label ??
                    displayDoc.categorie
                  )}
                </dd>

                <dt className="text-anac-muted">Langue</dt>
                <dd className="text-anac-text">{formaterLangue(displayDoc.langue)}</dd>

                <dt className="text-anac-muted">Taille</dt>
                <dd className="text-anac-text">{formaterTaille(displayDoc.taille)}</dd>

                <dt className="text-anac-muted">Version</dt>
                <dd className="text-anac-text">v{displayDoc.version}</dd>

                <dt className="text-anac-muted">Date d&apos;ajout</dt>
                <dd className="text-anac-text">
                  {new Date(displayDoc.createdAt).toLocaleDateString('fr-FR')}
                </dd>

                <dt className="text-anac-muted">Statut OCR</dt>
                <dd>
                  <BadgeOCR statut={displayDoc.statutOCR} />
                </dd>

                <dt className="text-anac-muted">Portail externe</dt>
                <dd>
                  <DocumentPortailBadge expose={displayDoc.visibilitePortail} />
                </dd>
              </dl>

              <p className="pt-2 text-[11px] text-anac-muted">ID document : {doc.id}</p>
            </TabsContent>

            <TabsContent value="ocr" className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-anac-muted">Statut :</span>
                <BadgeOCR statut={displayDoc.statutOCR} />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-anac-muted">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : texteExtrait ? (
                <>
                  <p className="text-xs font-medium text-anac-muted">Texte extrait</p>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-anac-border bg-anac-gray p-3 text-xs text-anac-text whitespace-pre-wrap">
                    {extraitCourt}
                  </div>
                </>
              ) : (
                <p className="text-sm text-anac-muted">Aucun texte extrait pour ce document.</p>
              )}

              <div className="flex items-center gap-3">
                {cap.canCorrectOcr && (
                  <Button variant="secondary" size="sm" onClick={() => onCorrigerOCR(displayDoc)}>
                    Corriger OCR
                  </Button>
                )}
                {cap.canRetryOcr && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={retraiterOCREnCours}
                    onClick={() => onRetraiterOCR(doc.id)}
                  >
                    {retraiterOCREnCours ? (
                      <>
                        <Loader2 size={13} className="animate-spin mr-1" /> Relance…
                      </>
                    ) : (
                      'Relancer OCR'
                    )}
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="portail" className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-anac-muted">État :</span>
                <DocumentPortailBadge expose={displayDoc.visibilitePortail} />
              </div>

              {displayDoc.visibilitePortail && (
                <p className="text-xs text-anac-muted">
                  {displayDoc.portailTokenDureeJours
                    ? `Liens de téléchargement valables ${displayDoc.portailTokenDureeJours} jour(s).`
                    : 'Liens de téléchargement sans expiration.'}
                </p>
              )}

              {canManagePortail(role) && displayDoc.statutOCR === 'traite' && (
                <div>
                  {displayDoc.visibilitePortail ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={retirerPortailEnCours}
                      onClick={() => onRetirerPortail(doc.id)}
                    >
                      Retirer du portail
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onOuvrirPortail(displayDoc)}>
                      Publier sur le portail
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
