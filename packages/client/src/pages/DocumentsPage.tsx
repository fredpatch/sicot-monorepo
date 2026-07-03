import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GlobeLock,
  Globe,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { documentsApi, portalApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';

// ── Types ──────────────────────────────────────────────────────────────────
interface Document {
  id: number;
  nom: string;
  nomOriginal: string;
  mimeType: string;
  taille: number;
  categorie: string;
  langue?: string;
  statutOCR: string;
  version: number;
  uploadePar: number;
  texteExtrait?: string;
  createdAt: string;
  visibilitePortail: boolean;
  portailTokenDureeJours?: number;
}

type Categorie =
  'tous' | 'accord' | 'correspondance' | 'mission' | 'traduction' | 'glossaire' | 'autre';

const CATEGORIES: { value: Categorie; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'accord', label: 'Accords' },
  { value: 'correspondance', label: 'Correspondances' },
  { value: 'mission', label: 'Missions' },
  { value: 'traduction', label: 'Traductions' },
  { value: 'glossaire', label: 'Glossaire' },
  { value: 'autre', label: 'Autres' },
];

const STATUTS_OCR = [
  { value: '__all__', label: 'Tous les statuts OCR' },
  { value: 'traite', label: 'Traité' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'a_retraiter', label: 'À retraiter' },
  { value: 'echec', label: 'Échec' },
];

// ── Schema OCR ─────────────────────────────────────────────────────────────
const ocrSchema = z.object({
  texte: z.string().min(1, 'Le texte corrigé est requis'),
});
type OcrFormData = z.infer<typeof ocrSchema>;

// ── Badge statut OCR ───────────────────────────────────────────────────────
function BadgeOCR({ statut }: { statut: string }) {
  const config: Record<string, { label: string; classe: string }> = {
    traite: { label: 'Traité', classe: 'badge-actif' },
    en_attente: { label: 'En attente', classe: 'badge-info' },
    a_retraiter: { label: 'À retraiter', classe: 'badge-warning' },
    echec: { label: 'Échec', classe: 'badge-expire' },
  };
  const { label, classe } = config[statut] ?? { label: statut, classe: 'badge-info' };
  return <span className={classe}>{label}</span>;
}

// ── Formatage taille fichier ───────────────────────────────────────────────
function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

// ── Composant principal ───────────────────────────────────────────────────
export default function DocumentsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // ── États divers ─────────────────────────────────────────────────────
  const [modalPortail, setModalPortail] = useState<Document | null>(null);
  const [dureeToken, setDureeToken] = useState<string>('30');

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState<Categorie>('tous');
  const [statutOCR, setStatutOCR] = useState('');
  const [page, setPage] = useState(1);

  // ── État upload ───────────────────────────────────────────────────────
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [uploadErreur, setUploadErreur] = useState<string | null>(null);
  const [uploadSucces, setUploadSucces] = useState<string | null>(null);
  const [categorieUpload, setCategorieUpload] = useState<string>('autre');

  // ── État correction OCR ───────────────────────────────────────────────
  const [documentOCR, setDocumentOCR] = useState<Document | null>(null);

  const ocrForm = useForm<OcrFormData>({
    resolver: zodResolver(ocrSchema),
    defaultValues: { texte: '' },
  });

  // ── Requête liste documents ───────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['documents', search, categorie, statutOCR, page],
    queryFn: async () => {
      const response = await documentsApi.lister({
        search: search || undefined,
        categorie: categorie !== 'tous' ? categorie : undefined,
        statutOCR: statutOCR || undefined,
        page,
        pageSize: 20,
      });
      return response.data as { data: Document[]; total: number };
    },
  });

  // ── Mutation correction OCR ───────────────────────────────────────────
  const corrigerOCRMutation = useMutation({
    mutationFn: ({ id, texte }: { id: number; texte: string }) =>
      documentsApi.corrigerOCR(id, texte),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDocumentOCR(null);
      ocrForm.reset();
    },
  });

  // ── Mutation catégorie ────────────────────────────────────────────────
  const categoriesMutation = useMutation({
    mutationFn: ({ id, cat }: { id: number; cat: string }) =>
      documentsApi.mettreAJourCategorie(id, cat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // ── Mutation visibilité portail ─────────────────────────────────────
  const togglePortailMutation = useMutation({
    mutationFn: ({ id, visible, duree }: { id: number; visible: boolean; duree?: number }) =>
      portalApi.toggleVisibilite(id, visible, duree),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setModalPortail(null);
    },
  });

  // ─ Mutation suppression ─────────────────────────────────────────────
  const supprimerMutation = useMutation({
    mutationFn: (id: number) => documentsApi.supprimer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  // ── Mutation retraitement OCR ─────────────────────────────────────────
  const retraiterOCRMutation = useMutation({
    mutationFn: (id: number) => documentsApi.retraiterOCR(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  // ── Handler upload ────────────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setUploadEnCours(true);
    setUploadErreur(null);
    setUploadSucces(null);

    try {
      const response = await documentsApi.upload(fichier, categorieUpload);
      const { document, doublon, categorieProposee } = response.data;

      let message = `"${document.nomOriginal}" archivé avec succès.`;
      if (doublon) {
        message += ' ⚠️ Un fichier identique existe déjà.';
      }
      if (categorieProposee !== categorieUpload) {
        message += ` Catégorie suggérée : ${categorieProposee}.`;
      }

      setUploadSucces(message);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de l'upload.";
      setUploadErreur(msg);
    } finally {
      setUploadEnCours(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function onOCRSubmit(data: OcrFormData) {
    if (!documentOCR) return;
    corrigerOCRMutation.mutate({ id: documentOCR.id, texte: data.texte });
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Gestion Documentaire</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} document{(data?.total ?? 0) > 1 ? 's' : ''} archivé
            {(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>

        {/* Zone upload */}
        <div className="flex items-center gap-2">
          <Select value={categorieUpload} onValueChange={setCategorieUpload}>
            <SelectTrigger className="w-40">
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

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadEnCours}
            className="gap-2"
          >
            {uploadEnCours ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Traitement OCR...
              </>
            ) : (
              <>
                <Upload size={13} />
                Uploader un document
              </>
            )}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.jpg,.jpeg,.png,.tiff"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* ── Messages upload ───────────────────────────────────────────── */}
      {uploadSucces && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-green-600 mt-0.5 shrink-0" />
            <span>{uploadSucces}</span>
          </div>
          <button
            onClick={() => setUploadSucces(null)}
            className="text-green-600 hover:text-green-800 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {uploadErreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <span>{uploadErreur}</span>
          </div>
          <button
            onClick={() => setUploadErreur(null)}
            className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-wrap gap-3">
        <Input
          type="text"
          placeholder={t('common.search') + '...'}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />

        <Select
          value={categorie}
          onValueChange={(v) => {
            setCategorie(v as Categorie);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statutOCR || '__all__'}
          onValueChange={(v) => {
            setStatutOCR(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUTS_OCR.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || categorie !== 'tous' || statutOCR) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearch('');
              setCategorie('tous');
              setStatutOCR('');
              setPage(1);
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left px-4 py-3">Nom du fichier</th>
              <th className="text-left px-4 py-3">Catégorie</th>
              <th className="text-left px-4 py-3">Langue</th>
              <th className="text-left px-4 py-3">Taille</th>
              <th className="text-left px-4 py-3">OCR</th>
              <th className="text-left px-4 py-3">Portail Externe</th>
              <th className="text-left px-4 py-3">Version</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-anac-muted">
                  <Loader2 size={16} className="animate-spin inline mr-2" />
                  {t('common.loading')}
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-anac-muted">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              data?.data.map((doc) => (
                <tr key={doc.id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="font-medium text-anac-navy truncate max-w-xs">
                      {doc.nomOriginal}
                    </div>
                    <div className="text-anac-muted text-xs">{doc.mimeType}</div>
                  </td>

                  {/* Catégorie inline — Select shadcn */}
                  <td className="px-4 py-3">
                    <Select
                      value={doc.categorie}
                      onValueChange={(cat) => categoriesMutation.mutate({ id: doc.id, cat })}
                    >
                      <SelectTrigger className="h-7 text-xs w-36 px-2">
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
                  </td>

                  <td className="px-4 py-3">
                    <span className="uppercase text-xs font-medium text-anac-muted">
                      {doc.langue ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-anac-muted">{formaterTaille(doc.taille)}</td>
                  <td className="px-4 py-3">
                    <BadgeOCR statut={doc.statutOCR} />
                  </td>
                  <td>
                    {doc.visibilitePortail && (
                      <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2.5 text-xs flex items-center gap-2">
                        <Globe size={13} />
                        <span>
                          Document est visible sur le portail externe.
                          {doc.portailTokenDureeJours
                            ? ` Liens de téléchargement valables ${doc.portailTokenDureeJours} jour(s).`
                            : ' Liens de téléchargement sans expiration.'}
                        </span>
                      </div>
                    )}

                    {!doc.visibilitePortail && (
                      <div className="bg-anac-gray border border-anac-border text-anac-muted rounded-lg px-3 py-2.5 text-xs flex items-center gap-2">
                        <GlobeLock size={13} />
                        <span>Document non exposé sur le portail externe.</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-anac-muted text-center">v{doc.version}</td>
                  <td className="px-4 py-3 text-anac-muted">
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Corriger OCR — si pas encore traité */}
                      {doc.statutOCR !== 'traite' && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setDocumentOCR(doc);
                            ocrForm.reset({ texte: '' });
                          }}
                          className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                        >
                          Corriger OCR
                        </Button>
                      )}

                      {/* Relancer OCR — si échec ou à retraiter */}
                      {(doc.statutOCR === 'echec' || doc.statutOCR === 'a_retraiter') && (
                        <>
                          <span className="text-anac-border">·</span>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => retraiterOCRMutation.mutate(doc.id)}
                            disabled={retraiterOCRMutation.isPending}
                            className="h-auto p-0 text-xs text-amber-600 hover:text-amber-800"
                          >
                            {retraiterOCRMutation.isPending ? (
                              <>
                                <Loader2 size={11} className="animate-spin inline mr-1" />
                                OCR...
                              </>
                            ) : (
                              'Relancer OCR'
                            )}
                          </Button>
                        </>
                      )}

                      {doc.texteExtrait && doc.statutOCR === 'traite' && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            sessionStorage.setItem(
                              'traduction_prefill',
                              JSON.stringify({
                                documentId: doc.id,
                                texte: doc.texteExtrait ?? '',
                              })
                            );

                            navigate('/traductions');
                          }}
                          className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                        >
                          Traduire
                        </Button>
                      )}

                      {/* Supprimer — soft delete */}
                      <span className="text-anac-border">·</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Supprimer "${doc.nomOriginal}" ?`)) {
                            supprimerMutation.mutate(doc.id);
                          }
                        }}
                        disabled={supprimerMutation.isPending}
                        className="h-auto p-0 text-xs text-anac-muted hover:text-anac-danger"
                      >
                        Supprimer
                      </Button>

                      {/* Toggle portail */}
                      {doc.statutOCR === 'traite' && (
                        <>
                          <span className="text-anac-border">·</span>
                          {doc.visibilitePortail ? (
                            // Document exposé → deux options : retirer ou voir sur le portail
                            <div className="flex items-center gap-1.5">
                              <a
                                href="/portail"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                              >
                                <Globe size={11} /> Exposé
                              </a>
                              <span className="text-anac-border">·</span>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() =>
                                  togglePortailMutation.mutate({ id: doc.id, visible: false })
                                }
                                disabled={togglePortailMutation.isPending}
                                className="h-auto p-0 text-xs text-red-400 hover:text-red-600"
                              >
                                Retirer
                              </Button>
                            </div>
                          ) : (
                            // Document non exposé → bouton pour publier
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setModalPortail(doc);
                                setDureeToken('30');
                              }}
                              className="h-auto p-0 text-xs text-anac-muted hover:text-anac-sky"
                            >
                              <GlobeLock size={11} className="inline mr-1" />
                              Portail
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-anac-muted">
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="gap-1.5"
            >
              <ChevronLeft size={13} /> Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="gap-1.5"
            >
              Suivant <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialog : Correction OCR ───────────────────────────────────── */}
      <Dialog
        open={!!documentOCR}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentOCR(null);
            ocrForm.reset();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Correction OCR</DialogTitle>
            <DialogDescription>
              {documentOCR?.nomOriginal} — Saisissez ou collez le texte correct extrait de ce
              document.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={ocrForm.handleSubmit(onOCRSubmit)} noValidate>
            <DialogBody>
              <div className="space-y-1.5">
                <Label htmlFor="ocr-texte">Texte corrigé</Label>
                <textarea
                  id="ocr-texte"
                  {...ocrForm.register('texte')}
                  rows={12}
                  className="input font-mono text-xs resize-none"
                  placeholder="Texte extrait corrigé..."
                  aria-invalid={!!ocrForm.formState.errors.texte}
                />
                {ocrForm.formState.errors.texte && (
                  <p className="text-[11px] text-anac-danger">
                    {ocrForm.formState.errors.texte.message}
                  </p>
                )}
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDocumentOCR(null);
                  ocrForm.reset();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={corrigerOCRMutation.isPending} className="gap-2">
                {corrigerOCRMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('common.save')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Portail ───────────────────────────────────────────── */}
      <Dialog
        open={!!modalPortail}
        onOpenChange={(open) => {
          if (!open) setModalPortail(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe size={15} className="text-anac-sky" />
              Exposer sur le portail
            </DialogTitle>
            <DialogDescription>{modalPortail?.nomOriginal}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label>Durée de validité des liens de téléchargement</Label>
              <Select value={dureeToken} onValueChange={setDureeToken}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                  <SelectItem value="0">Sans expiration</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-anac-muted">
                Durée de validité des liens envoyés aux utilisateurs externes qui demandent le
                téléchargement.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-3 py-2.5 text-xs">
              Le document sera visible par tous les visiteurs du portail externe. La consultation
              est libre, le téléchargement nécessite un email.
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalPortail(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!modalPortail) return;
                togglePortailMutation.mutate({
                  id: modalPortail.id,
                  visible: true,
                  duree: dureeToken === '0' ? undefined : parseInt(dureeToken),
                });
              }}
              disabled={togglePortailMutation.isPending}
              className="gap-2"
            >
              {togglePortailMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Publication...
                </>
              ) : (
                <>
                  <Globe size={13} /> Publier sur le portail
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
