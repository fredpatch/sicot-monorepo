// packages/client/src/pages/portal/hooks/mutations.ts
import { useMutation } from '@tanstack/react-query';
import { portalApi } from '@/lib/portal.api';

export function useSecureDownloadRequestMutation() {
  return useMutation({
    mutationFn: ({ documentId, email }: { documentId: number; email: string }) =>
      portalApi.genererToken(documentId, email),
  });
}
