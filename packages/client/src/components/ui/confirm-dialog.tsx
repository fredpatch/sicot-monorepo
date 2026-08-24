import { createContext, useCallback, useContext, useState } from 'react';

import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Replaces window.confirm() app-wide with an accessible shadcn-style dialog.
 * Mounted once near the app root; await useConfirm()(...) anywhere below it.
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  function close(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state !== null} onOpenChange={(open) => !open && close(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{state?.options.title}</DialogTitle>
            {state?.options.description && (
              <DialogDescription>{state.options.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => close(false)}>
              {state?.options.cancelLabel ?? 'Annuler'}
            </Button>
            <Button
              type="button"
              variant={state?.options.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={() => close(true)}
            >
              {state?.options.confirmLabel ?? 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  return ctx;
}
