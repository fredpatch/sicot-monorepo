import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  FileText,
  Download,
  Eye,
  Globe,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { portalApi } from '@/lib/portal.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface DocumentPortail {
  id: number;
  nomOriginal: string;
  categorie: string;
  langue?: string;
  taille: number;
  mimeType: string;
  portailTokenDureeJours?: number;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function formaterCategorie(cat: string): string {
  const labels: Record<string, string> = {
    accord: 'Accord',
    correspondance: 'Correspondance',
    mission: 'Mission',
    traduction: 'Traduction',
    glossaire: 'Glossaire',
    autre: 'Autre',
  };
  return labels[cat] ?? cat;
}

const CATEGORIES = [
  { value: '__all__', label: 'Toutes catégories' },
  { value: 'accord', label: 'Accords' },
  { value: 'correspondance', label: 'Correspondances' },
  { value: 'mission', label: 'Missions' },
  { value: 'traduction', label: 'Traductions' },
  { value: 'glossaire', label: 'Glossaire' },
  { value: 'autre', label: 'Autres' },
];

// ── Modal téléchargement ───────────────────────────────────────────────────
function ModalTelechargement({
  document,
  onClose,
}: {
  document: DocumentPortail | null;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const genererMutation = useMutation({
    mutationFn: () => portalApi.genererToken(document!.id, email),
    onSuccess: () => {
      setSucces(true);
      setErreur(null);
    },
    onError: (err: unknown) => {
      setErreur(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la génération du lien.'
      );
    },
  });

  function handleClose() {
    setEmail('');
    setSucces(false);
    setErreur(null);
    onClose();
  }

  if (!document) return null;

  return (
    <Dialog
      open={!!document}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={15} className="text-anac-sky" />
            Télécharger le document
          </DialogTitle>
          <DialogDescription>{document.nomOriginal}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {!succes ? (
            <>
              <p className="text-sm text-anac-text">
                Saisissez votre adresse email pour recevoir un lien de téléchargement sécurisé.
                {document.portailTokenDureeJours && (
                  <span className="block text-xs text-anac-muted mt-1">
                    Le lien sera valable {document.portailTokenDureeJours} jour(s).
                  </span>
                )}
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="email-dl">Votre adresse email *</Label>
                <Input
                  id="email-dl"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErreur(null);
                  }}
                  placeholder="votre@email.com"
                  autoFocus
                />
              </div>

              {erreur && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs">
                  {erreur}
                </div>
              )}
            </>
          ) : (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 text-sm text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Send size={18} className="text-green-600" />
              </div>
              <p className="font-medium">Lien envoyé !</p>
              <p className="text-xs text-green-600">
                Consultez votre boîte email à l&apos;adresse <strong>{email}</strong>.
                {document.portailTokenDureeJours && (
                  <span className="block mt-1">
                    Le lien sera valable {document.portailTokenDureeJours} jour(s).
                  </span>
                )}
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>
            {succes ? 'Fermer' : 'Annuler'}
          </Button>
          {!succes && (
            <Button
              onClick={() => genererMutation.mutate()}
              disabled={!email.includes('@') || genererMutation.isPending}
              className="gap-2"
            >
              {genererMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Envoi...
                </>
              ) : (
                <>
                  <Send size={13} /> Recevoir le lien
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Viewer inline ──────────────────────────────────────────────────────────
function ViewerDocument({
  document,
  onClose,
  onTelechargement,
}: {
  document: DocumentPortail;
  onClose: () => void;
  onTelechargement: () => void;
}) {
  const urlConsultation = portalApi.getUrlConsultation(document.id);
  const isPdf = document.mimeType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Barre haut */}
      <div className="flex items-center justify-between px-4 py-3 bg-anac-navy text-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={16} className="shrink-0" />
          <span className="text-sm font-medium truncate">{document.nomOriginal}</span>
          <span className="text-xs text-white/60 uppercase shrink-0">
            {document.mimeType.split('/')[1]}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={onTelechargement}
            className="gap-1.5 bg-anac-sky hover:bg-anac-sky/80 text-white border-0 h-8"
          >
            <Download size={13} /> Télécharger
          </Button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        {isPdf ? (
          <iframe
            src={urlConsultation}
            className="w-full h-full border-0"
            title={document.nomOriginal}
          />
        ) : (
          // Pour les non-PDF (images, etc.)
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={urlConsultation}
              alt={document.nomOriginal}
              className="max-w-full max-h-full object-contain rounded shadow-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function PortailPage() {
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [page, setPage] = useState(1);

  const [documentViewer, setDocumentViewer] = useState<DocumentPortail | null>(null);
  const [documentDl, setDocumentDl] = useState<DocumentPortail | null>(null);

  // ── Requête liste documents ───────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['portail-documents', search, categorie, page],
    queryFn: async () => {
      const res = await portalApi.lister({
        search: search || undefined,
        categorie: categorie || undefined,
        page,
        pageSize: 12,
      });
      return res.data as { data: DocumentPortail[]; total: number };
    },
  });

  const totalPages = data ? Math.ceil(data.total / 12) : 0;

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── En-tête portail ──────────────────────────────────────────── */}
      <div className="bg-anac-navy text-white py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Globe size={24} className="text-anac-sky" />
            <h1 className="text-xl font-bold">Portail Documentaire</h1>
          </div>
          <p className="text-white/70 text-sm">
            ANAC Gabon - Agence Nationale de l&apos;Aviation Civile
          </p>
          <p className="text-white/50 text-xs mt-1">
            Consultation libre · Téléchargement sur demande
          </p>
        </div>
      </div>

      {/* ── Barre de recherche ────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un document..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={categorie || '__all__'}
            onValueChange={(v) => {
              setCategorie(v === '__all__' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
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
          {(search || categorie) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setCategorie('');
                setPage(1);
              }}
            >
              <X size={13} />
            </Button>
          )}
        </div>
      </div>

      {/* ── Liste documents ───────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Compteur */}
        <p className="text-sm text-gray-500 mb-4">
          {isLoading
            ? '...'
            : `${data?.total ?? 0} document${(data?.total ?? 0) > 1 ? 's' : ''} disponible${(data?.total ?? 0) > 1 ? 's' : ''}`}
        </p>

        {/* Grille */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            Chargement...
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun document disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.data.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                {/* Icône + catégorie */}
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-anac-navy/8 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-anac-navy" />
                  </div>
                  <span className="text-[11px] font-medium text-anac-sky bg-anac-sky/8 rounded-full px-2.5 py-0.5">
                    {formaterCategorie(doc.categorie)}
                  </span>
                </div>

                {/* Nom */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-anac-navy leading-snug line-clamp-2">
                    {doc.nomOriginal}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                    <span>{formaterTaille(doc.taille)}</span>
                    {doc.langue && (
                      <>
                        <span>·</span>
                        <span className="uppercase">{doc.langue}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDocumentViewer(doc)}
                    className="flex-1 gap-1.5 text-xs h-8"
                  >
                    <Eye size={12} /> Consulter
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDocumentDl(doc)}
                    className="flex-1 gap-1.5 text-xs h-8"
                  >
                    <Download size={12} /> Télécharger
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-500">
              Page {page} / {totalPages}
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
      </div>

      {/* ── Viewer plein écran ────────────────────────────────────────── */}
      {documentViewer && (
        <ViewerDocument
          document={documentViewer}
          onClose={() => setDocumentViewer(null)}
          onTelechargement={() => {
            setDocumentDl(documentViewer);
            setDocumentViewer(null);
          }}
        />
      )}

      {/* ── Modal téléchargement ──────────────────────────────────────── */}
      <ModalTelechargement document={documentDl} onClose={() => setDocumentDl(null)} />
    </div>
  );
}
