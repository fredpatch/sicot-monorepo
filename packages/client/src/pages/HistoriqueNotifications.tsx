import { useQuery } from '@tanstack/react-query';
import { History, CheckCircle2, XCircle } from 'lucide-react';
import { notificationsApi, type NotificationType } from '@/lib/notifications.api';

interface NotificationHistorique {
  id: number;
  destinataireEmail: string;
  destinataireNom?: string;
  declencheParNom?: string;
  statut: 'envoyee' | 'echec';
  createdAt: string;
}

interface HistoriqueNotificationsProps {
  type: NotificationType;
  entiteId: number;
}

export default function HistoriqueNotifications({ type, entiteId }: HistoriqueNotificationsProps) {
  const { data: historique, isLoading } = useQuery({
    queryKey: ['notifications-historique', type, entiteId],
    queryFn: async () => {
      const res = await notificationsApi.historiqueEntite(type, entiteId);
      return res.data as NotificationHistorique[];
    },
  });

  if (isLoading || !historique || historique.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide flex items-center gap-1.5">
        <History size={11} />
        Relances envoyées ({historique.length})
      </p>
      <div className="card p-0 overflow-hidden divide-y divide-anac-border/60">
        {historique.map((n) => (
          <div key={n.id} className="flex items-center gap-3 px-4 py-2.5">
            {n.statut === 'envoyee' ? (
              <CheckCircle2 size={13} className="text-green-500 shrink-0" />
            ) : (
              <XCircle size={13} className="text-red-500 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-anac-navy truncate">
                {n.destinataireNom ?? n.destinataireEmail}
              </p>
              <p className="text-[11px] text-anac-muted">par {n.declencheParNom ?? 'CCIT'}</p>
            </div>
            <span className="text-[11px] text-anac-muted shrink-0">
              {new Date(n.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
