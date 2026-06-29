/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Upload, X, CheckCircle2 } from 'lucide-react';

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
import { missionsApi, type MissionStatut } from '@/lib/missions.api';
import { documentsApi } from '@/lib/documents.api';
import { usersApi } from '@/lib/users.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface User {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
}

// ── Schema Zod ─────────────────────────────────────────────────────────────
const missionSchema = z
  .object({
    titre: z.string().min(1, 'Le titre est requis'),
    destination: z.string().min(1, 'La destination est requise'),
    pays: z.string().min(1, 'Le pays est requis'),
    dateDebut: z.string().min(1, 'La date de début est requise'),
    dateFin: z.string().min(1, 'La date de fin est requise'),
    statut: z.enum(['planifiee', 'en_cours', 'terminee', 'annulee']).optional(),
    participantsIds: z.array(z.number()).optional(),
    rapportDocumentId: z.number().optional(),
  })
  .refine((data) => !data.dateDebut || !data.dateFin || data.dateDebut <= data.dateFin, {
    message: 'La date de fin doit être après la date de début',
    path: ['dateFin'],
  });

type MissionFormData = z.infer<typeof missionSchema>;

// ── Sélecteur participants ─────────────────────────────────────────────────
function SelectParticipants({
  users,
  value,
  onChange,
}: {
  users: User[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
      {users.length === 0 ? (
        <p className="text-anac-muted text-sm px-3 py-4 text-center">Aucun agent disponible</p>
      ) : (
        users.map((user) => (
          <label
            key={user.id}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={value.includes(user.id)}
              onChange={() => toggle(user.id)}
              className="rounded border-gray-300 text-anac-sky focus:ring-anac-sky"
            />
            <div>
              <div className="text-sm font-medium text-anac-navy">
                {user.prenom} {user.nom}
              </div>
              <div className="text-xs text-anac-muted">{user.matricule}</div>
            </div>
          </label>
        ))
      )}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function MissionFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const isEdit = !!id;
  const missionId = id ? parseInt(id) : undefined;

  // ── Upload rapport ────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [uploadErreur, setUploadErreur] = useState<string | null>(null);
  const [rapportLie, setRapportLie] = useState<{ id: number; nom: string } | null>(null);
  const [afficherListeDocs, setAfficherListeDocs] = useState(false);

  // ── Charger mission existante ─────────────────────────────────────────
  const { data: mission, isLoading: chargementMission } = useQuery({
    queryKey: ['mission', missionId],
    queryFn: async () => {
      const res = await missionsApi.getById(missionId!);
      return res.data;
    },
    enabled: isEdit,
  });

  // ── Charger agents ────────────────────────────────────────────────────
  const { data: usersData } = useQuery({
    queryKey: ['users-liste'],
    queryFn: async () => {
      const res = await usersApi.lister({ pageSize: 200 });
      return res.data as { data: User[] };
    },
  });

  // ── Charger rapports existants ────────────────────────────────────────
  const { data: docsExistants } = useQuery({
    queryKey: ['documents-missions'],
    queryFn: async () => {
      const res = await documentsApi.lister({ categorie: 'mission', pageSize: 100 });
      return res.data as { data: { id: number; nomOriginal: string; createdAt: string }[] };
    },
    enabled: afficherListeDocs,
  });

  const agents = usersData?.data ?? [];

  // ── Formulaire ────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MissionFormData>({
    resolver: zodResolver(missionSchema),
    defaultValues: {
      titre: '',
      destination: '',
      pays: '',
      dateDebut: '',
      dateFin: '',
      participantsIds: [],
    },
  });

  const participantsWatched = watch('participantsIds') ?? [];

  // Pré-remplir si édition
  useEffect(() => {
    if (mission) {
      reset({
        titre: mission.titre,
        destination: mission.destination,
        pays: mission.pays,
        dateDebut: mission.dateDebut?.split('T')[0] ?? '',
        dateFin: mission.dateFin?.split('T')[0] ?? '',
        statut: mission.statut,
        participantsIds: mission.participants?.map((p: { id: number }) => p.id) ?? [],
        rapportDocumentId: mission.rapportDocumentId,
      });

      // Charger le nom du rapport si existant
      if (mission.rapportDocumentId) {
        documentsApi.getById(mission.rapportDocumentId).then((res) => {
          setRapportLie({ id: res.data.id, nom: res.data.nomOriginal });
        });
      }
    }
  }, [mission, reset]);

  // ── Handler upload rapport ────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setUploadEnCours(true);
    setUploadErreur(null);

    try {
      const res = await documentsApi.upload(fichier, 'mission');
      const { document } = res.data;
      setRapportLie({ id: document.id, nom: document.nomOriginal });
      setValue('rapportDocumentId', document.id);
    } catch {
      setUploadErreur("Erreur lors de l'upload. Vérifiez le fichier et réessayez.");
    } finally {
      setUploadEnCours(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────
  const creerMutation = useMutation({
    mutationFn: (data: MissionFormData) =>
      missionsApi.creer({
        titre: data.titre,
        destination: data.destination,
        pays: data.pays,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        participantsIds: data.participantsIds,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      navigate(`/missions/${res.data.id}`);
    },
  });

  const modifierMutation = useMutation({
    mutationFn: (data: MissionFormData) =>
      missionsApi.mettreAJour(missionId!, {
        titre: data.titre,
        destination: data.destination,
        pays: data.pays,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        statut: data.statut,
        participantsIds: data.participantsIds,
        rapportDocumentId: data.rapportDocumentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      navigate(`/missions/${missionId}`);
    },
  });

  function onSubmit(data: MissionFormData) {
    if (isEdit) {
      modifierMutation.mutate(data);
    } else {
      creerMutation.mutate(data);
    }
  }

  const isPending = creerMutation.isPending || modifierMutation.isPending;
  const erreurServeur = creerMutation.error || modifierMutation.error;

  // ── Chargement initial ────────────────────────────────────────────────
  if (isEdit && chargementMission) {
    return (
      <div className="flex items-center justify-center py-24 text-anac-muted">
        <Loader2 size={16} className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(missionId ? `/missions/${missionId}` : '/missions')}
          className="gap-1.5"
        >
          <ArrowLeft size={13} /> Retour
        </Button>
        <div>
          <h2 className="text-xl font-bold text-anac-navy">
            {isEdit ? 'Modifier la mission' : 'Nouvelle mission'}
          </h2>
        </div>
      </div>

      {/* ── Erreur serveur ────────────────────────────────────────────── */}
      {erreurServeur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {(erreurServeur as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Une erreur est survenue.'}
        </div>
      )}

      {/* ── Formulaire ───────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card p-6 space-y-5">
        {/* Titre */}
        <div className="space-y-1.5">
          <Label htmlFor="titre">Titre de la mission *</Label>
          <Input
            id="titre"
            {...register('titre')}
            placeholder="ex : Participation à l'Assemblée OACI 2026"
            aria-invalid={!!errors.titre}
          />
          {errors.titre && <p className="text-[11px] text-anac-danger">{errors.titre.message}</p>}
        </div>

        {/* Destination + Pays */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="destination">Destination *</Label>
            <Input
              id="destination"
              {...register('destination')}
              placeholder="ex : Montréal"
              aria-invalid={!!errors.destination}
            />
            {errors.destination && (
              <p className="text-[11px] text-anac-danger">{errors.destination.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pays">Pays *</Label>
            <Input
              id="pays"
              {...register('pays')}
              placeholder="ex : Canada"
              aria-invalid={!!errors.pays}
            />
            {errors.pays && <p className="text-[11px] text-anac-danger">{errors.pays.message}</p>}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dateDebut">Date de début *</Label>
            <Input
              id="dateDebut"
              type="date"
              {...register('dateDebut')}
              aria-invalid={!!errors.dateDebut}
            />
            {errors.dateDebut && (
              <p className="text-[11px] text-anac-danger">{errors.dateDebut.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dateFin">Date de fin *</Label>
            <Input
              id="dateFin"
              type="date"
              {...register('dateFin')}
              aria-invalid={!!errors.dateFin}
            />
            {errors.dateFin && (
              <p className="text-[11px] text-anac-danger">{errors.dateFin.message}</p>
            )}
          </div>
        </div>

        {/* Statut — édition seulement */}
        {isEdit && (
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Controller
              name="statut"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifiee">Planifiée</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="terminee">Terminée</SelectItem>
                    <SelectItem value="annulee">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {/* Participants */}
        <div className="space-y-1.5">
          <Label>
            Participants ANAC
            <span className="text-anac-muted font-normal ml-1">
              ({participantsWatched.length} sélectionné{participantsWatched.length > 1 ? 's' : ''})
            </span>
          </Label>
          <Controller
            name="participantsIds"
            control={control}
            render={({ field }) => (
              <SelectParticipants
                users={agents}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Rapport de mission — édition seulement */}
        {isEdit && (
          <div className="space-y-1.5">
            <Label>
              Rapport de mission
              <span className="text-anac-muted font-normal ml-1">(optionnel)</span>
            </Label>

            {rapportLie ? (
              <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="text-sm text-anac-navy font-medium truncate max-w-xs">
                    {rapportLie.nom}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRapportLie(null);
                    setValue('rapportDocumentId', undefined);
                    setAfficherListeDocs(false);
                  }}
                  className="text-anac-muted hover:text-anac-danger transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadEnCours}
                    className="gap-1.5"
                  >
                    {uploadEnCours ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Upload...
                      </>
                    ) : (
                      <>
                        <Upload size={12} /> Uploader un rapport
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setAfficherListeDocs((v) => !v)}
                    className="gap-1.5"
                  >
                    {afficherListeDocs ? 'Masquer' : 'Lier un existant'}
                  </Button>
                </div>

                {afficherListeDocs && (
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {!docsExistants ? (
                      <p className="text-anac-muted text-sm px-3 py-4 text-center">
                        <Loader2 size={13} className="animate-spin inline mr-2" />
                        Chargement...
                      </p>
                    ) : docsExistants.data.length === 0 ? (
                      <p className="text-anac-muted text-sm px-3 py-4 text-center">
                        Aucun document de type &quot;Mission&quot; dans M8.
                      </p>
                    ) : (
                      docsExistants.data.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setRapportLie({ id: doc.id, nom: doc.nomOriginal });
                            setValue('rapportDocumentId', doc.id);
                            setAfficherListeDocs(false);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-anac-navy">
                            {doc.nomOriginal}
                          </div>
                          <div className="text-xs text-anac-muted">
                            {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {uploadErreur && <p className="text-[11px] text-anac-danger">{uploadErreur}</p>}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={handleUpload}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(missionId ? `/missions/${missionId}` : '/missions')}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" /> {t('common.loading')}
              </>
            ) : isEdit ? (
              t('common.save')
            ) : (
              'Créer la mission'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
