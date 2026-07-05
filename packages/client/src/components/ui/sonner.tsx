import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-anac-text group-[.toaster]:border-anac-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-anac-muted',
          actionButton: 'group-[.toast]:bg-anac-navy group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-anac-gray group-[.toast]:text-anac-muted',
          success: 'group-[.toaster]:!text-anac-success',
          error: 'group-[.toaster]:!text-anac-danger',
        },
      }}
      {...props}
    />
  );
}
