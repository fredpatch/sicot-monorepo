import { toast } from 'sonner';

interface ConfirmToastOptions {
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Replaces window.confirm() with a non-blocking sonner toast carrying
 * "Confirm"/"Cancel" actions. onConfirm only runs if the user clicks confirm.
 */
export function confirmToast(message: string, onConfirm: () => void, options?: ConfirmToastOptions) {
  const toastId = toast(message, {
    duration: 10000,
    action: {
      label: options?.confirmLabel ?? 'Confirmer',
      onClick: () => onConfirm(),
    },
    cancel: {
      label: options?.cancelLabel ?? 'Annuler',
      onClick: () => toast.dismiss(toastId),
    },
  });
}
