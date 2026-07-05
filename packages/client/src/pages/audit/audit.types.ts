// packages/client/src/pages/audit/audit.types.ts
export interface AuditLog {
  id: number;
  userId?: number;
  userMatricule?: string;
  userNom?: string;
  userPrenom?: string;
  action: string;
  module: string;
  entiteId?: number;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}
