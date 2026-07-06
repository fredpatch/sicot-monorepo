# 🧩 SICOT - Code Patterns

## Server-Side Patterns

### Module Pattern (Service → Controller → Route)

Every module follows a strict 3-layer separation:

```
routes/module.route.ts      HTTP binding, middleware chain
  └── controllers/module.controller.ts  Validates input, calls service, formats response
        └── services/module.service.ts  Business logic + Drizzle queries
```

**Route example**:
```typescript
// routes/documents.route.ts
import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireAdmin } from '../../../middleware/requiredRole';
import { upload } from '../../../middleware/upload';
import * as ctrl from '../controllers/documents.controller';

const router = Router();
router.use(authenticate);                          // all routes require login
router.get('/', ctrl.lister);
router.post('/upload', upload.single('file'), ctrl.upload);
router.get('/:id', ctrl.getById);
router.patch('/:id', ctrl.mettreAJour);
router.delete('/:id', requireAdmin, ctrl.supprimer);
export default router;
```

**Service example**:
```typescript
// services/documents.service.ts
import { db } from '../../../db/index.js';
import { documents } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export async function lister(filters: { categorie?: string }) {
  return db.select().from(documents)
    .where(filters.categorie ? eq(documents.categorie, filters.categorie as any) : undefined)
    .orderBy(desc(documents.createdAt));
}
```

**Controller example**:
```typescript
// controllers/documents.controller.ts
import { Request, Response } from 'express';
import * as service from '../services/documents.service';

export async function lister(req: Request, res: Response) {
  try {
    const docs = await service.lister({ categorie: req.query.categorie as string });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Erreur interne.' });
  }
}
```

### Audit Log Pattern

Every mutating operation calls `logAudit()` from `auth.service.ts`:
```typescript
import { logAudit } from '../../auth/services/auth.service';

await logAudit({
  userId: req.user!.userId,
  action: 'DOCUMENT_UPLOADE',
  module: 'M8',
  entiteId: document.id,
  details: { nom: document.nom, taille: document.taille },
  ip: req.ip,
});
```

---

## Client-Side Patterns

### API Call Pattern (TanStack Query)

```typescript
// Hook for listing documents
import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/lib/documents.api';

export function useDocuments(filters?: { categorie?: string }) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => documentsApi.lister(filters).then(r => r.data),
  });
}
```

### Form Pattern (react-hook-form + zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  categorie: z.enum(['accord', 'correspondance', 'autre']),
});
type FormData = z.infer<typeof schema>;

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { nom: '', categorie: 'autre' },
  mode: 'onChange',
});
```

### Mutation Pattern

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const qc = useQueryClient();
const upload = useMutation({
  mutationFn: (file: File) => documentsApi.upload(file),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['documents'] });
  },
  onError: (err: unknown) => {
    setServerError((err as AxiosError<{ message: string }>)?.response?.data?.message ?? 'Erreur.');
  },
});
```

### Error Message Pattern

```typescript
// Consistent error extraction from Axios errors
function extractMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message ?? fallback;
}
```

### shadcn-style Component Pattern (Manual CVA)

```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

const myVariants = cva('base-classes', {
  variants: {
    variant: { default: '...', destructive: '...' },
    size: { sm: '...', default: '...', lg: '...' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

interface MyProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof myVariants> {}

export const MyComponent = forwardRef<HTMLDivElement, MyProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div ref={ref} className={cn(myVariants({ variant, size }), className)} {...props} />
  )
);
MyComponent.displayName = 'MyComponent';
```

### Page Layout Pattern

```typescript
export default function SomePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-anac-navy">Page Title</h1>
        <Button onClick={...}>Action</Button>
      </div>
      <div className="card">
        {/* Content */}
      </div>
    </div>
  );
}
```
Note: the `Layout.tsx` wraps all pages in padding and scroll container. Pages only need internal layout.
