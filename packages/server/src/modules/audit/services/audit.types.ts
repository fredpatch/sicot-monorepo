export interface AuditFilters {
  userId?: number;
  module?: string;
  action?: string;
  dateDebut?: Date;
  dateFin?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogView {
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
  createdAt: Date;
}
