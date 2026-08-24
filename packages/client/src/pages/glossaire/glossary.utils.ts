// packages/client/src/pages/glossaire/glossary.utils.ts
export function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function getErrorMessage(error: unknown): string | undefined {
  const axiosErr = error as { response?: { data?: { message?: string } } } | null;
  return axiosErr?.response?.data?.message;
}
