// packages/client/src/pages/audit/components/AuditDetailsDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatDateHeure } from '../audit.utils';
import type { AuditLog } from '../audit.types';

interface AuditDetailsDialogProps {
  log: AuditLog | null;
  onOpenChange: (open: boolean) => void;
}

export function AuditDetailsDialog({ log, onOpenChange }: AuditDetailsDialogProps) {
  return (
    <Dialog open={!!log} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{log?.action}</DialogTitle>
          <DialogDescription>
            {log && formatDateHeure(log.createdAt)} - Module {log?.module}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-anac-muted">Utilisateur</span>
              <span className="text-anac-navy font-medium">
                {log?.userMatricule
                  ? `${log.userPrenom} ${log.userNom} (${log.userMatricule})`
                  : 'Système'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-anac-muted">Entité concernée</span>
              <span className="text-anac-navy font-medium">{log?.entiteId ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-anac-muted">Adresse IP</span>
              <span className="text-anac-navy font-mono text-xs">{log?.ip ?? '-'}</span>
            </div>
            {log?.details && (
              <div>
                <p className="text-anac-muted mb-1.5">Détails</p>
                <pre className="bg-anac-gray/50 rounded-lg p-3 text-xs overflow-x-auto text-anac-text">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
