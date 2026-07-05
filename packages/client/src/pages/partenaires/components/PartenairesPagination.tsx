import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PartenairesPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageLabel: string;
  ofLabel: string;
}

export function PartenairesPagination({
  page,
  totalPages,
  onPageChange,
  pageLabel,
  ofLabel,
}: PartenairesPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-anac-muted">
        {pageLabel} {page} {ofLabel} {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="gap-1.5"
        >
          <ChevronLeft size={13} /> Précédent
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="gap-1.5"
        >
          Suivant <ChevronRight size={13} />
        </Button>
      </div>
    </div>
  );
}
