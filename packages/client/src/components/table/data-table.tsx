import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;

  /** Server-driven ("manual") pagination. Omit both to render without a pager. */
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;

  /** Server-driven ("manual") sorting. Omit to disable sort UI. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;

  /** Optional column-level filter state, for pages that want it (most use their own filter bar instead). */
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;

  className?: string;
  rowClassName?: (row: TData) => string | undefined;

  /**
   * Rend la ligne cliquable (curseur, focus clavier, Entrée/Espace) — utilisé
   * par les pages avec un panneau de détail (ex. Documents). Les cellules
   * contenant leurs propres contrôles interactifs (select, bouton, menu)
   * doivent porter `data-stop-row-click` sur leur wrapper pour ne pas
   * déclencher la sélection de ligne en même temps que leur propre action.
   */
  onRowClick?: (row: TData) => void;
}

// Lecture non typée du champ `meta` d'une colonne — ColumnMeta<TData,TValue>
// est une interface vide par défaut dans ce projet (pas d'augmentation de
// module @tanstack/table-core), donc pas de contrat officiel à étendre ici.
function colonneClassName(meta: unknown): string | undefined {
  return (meta as { className?: string } | undefined)?.className;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  emptyMessage = 'Aucune donnée',
  loadingMessage = 'Chargement...',
  pageCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  className,
  rowClassName,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const manualPagination = pagination !== undefined && onPaginationChange !== undefined;
  const manualSorting = sorting !== undefined && onSortingChange !== undefined;
  const manualFiltering = columnFilters !== undefined && onColumnFiltersChange !== undefined;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    manualPagination,
    manualSorting,
    manualFiltering,
    pageCount: manualPagination ? pageCount : undefined,
    state: {
      ...(pagination ? { pagination } : {}),
      ...(sorting ? { sorting } : {}),
      ...(columnFilters ? { columnFilters } : {}),
    },
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
  });

  const colSpan = columns.length;

  return (
    <div className={cn('card p-0 overflow-hidden', className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortState = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={colonneClassName(header.column.columnDef.meta)}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-anac-sky transition-colors"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortState === 'asc' ? (
                          <ArrowUp size={13} />
                        ) : sortState === 'desc' ? (
                          <ArrowDown size={13} />
                        ) : (
                          <ArrowUpDown size={13} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center py-12 text-anac-muted">
                <Loader2 size={16} className="animate-spin inline mr-2" />
                {loadingMessage}
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center py-12 text-anac-muted">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  onRowClick && 'cursor-pointer focus-visible:bg-anac-gray',
                  rowClassName?.(row.original)
                )}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onClick={
                  onRowClick
                    ? (e) => {
                        if ((e.target as HTMLElement).closest('[data-stop-row-click]')) return;
                        onRowClick(row.original);
                      }
                    : undefined
                }
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if ((e.target as HTMLElement).closest('[data-stop-row-click]')) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={colonneClassName(cell.column.columnDef.meta)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {manualPagination && pagination !== undefined && onPaginationChange !== undefined && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-anac-border text-sm text-anac-muted">
          <span>
            Page {pagination.pageIndex + 1} sur {Math.max(pageCount ?? 1, 1)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.pageIndex === 0}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
