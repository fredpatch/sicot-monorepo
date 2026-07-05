// packages/client/src/pages/documents/components/DocumentsFiltres.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORIES, STATUTS_OCR } from '../documents.constants';
import type { Categorie } from '../documents.types';

interface DocumentsFiltresProps {
  search: string;
  onSearchChange: (value: string) => void;
  categorie: Categorie;
  onCategorieChange: (value: Categorie) => void;
  statutOCR: string;
  onStatutOCRChange: (value: string) => void;
  onReset: () => void;
  searchPlaceholder: string;
}

export function DocumentsFiltres({
  search,
  onSearchChange,
  categorie,
  onCategorieChange,
  statutOCR,
  onStatutOCRChange,
  onReset,
  searchPlaceholder,
}: DocumentsFiltresProps) {
  const aUnFiltreActif = search || categorie !== 'tous' || statutOCR;

  return (
    <div className="card p-4 flex flex-wrap gap-3">
      <Input
        type="text"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />

      <Select value={categorie} onValueChange={(v) => onCategorieChange(v as Categorie)}>
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
        onValueChange={(v) => onStatutOCRChange(v === '__all__' ? '' : v)}
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

      {aUnFiltreActif && (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
