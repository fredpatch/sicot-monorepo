import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <AnimatePresence>
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.14 }}
            className="text-[11px] text-anac-danger flex items-center gap-1"
            role="alert"
          >
            <AlertCircle size={10} className="shrink-0" />
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" className="text-[11px] text-anac-muted">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
