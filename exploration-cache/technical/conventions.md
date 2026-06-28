# 📐 SICOT – Conventions

## Naming

### Files & Folders
| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `LoginPage.tsx`, `FormField.tsx` |
| Hooks | camelCase, `use` prefix | `useDocuments.ts` |
| API files | camelCase, `.api.ts` suffix | `documents.api.ts` |
| Server services | camelCase, `.service.ts` | `documents.service.ts` |
| Server controllers | camelCase, `.controller.ts` | `documents.controller.ts` |
| Server routes | camelCase, `.route.ts` | `documents.route.ts` |
| Page folders | kebab-case | `pages/login/` |
| Sub-components | co-located with page | `pages/login/components/` |

### Variables & Functions
| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `function LoginPage()` |
| Hooks | camelCase | `const loginForm = useForm(...)` |
| Server services | camelCase, French nouns | `lister`, `creer`, `mettreAJour` |
| DB columns | camelCase in Drizzle, snake_case in PG | `motDePasseHash` → `mot_de_passe_hash` |
| API endpoints | French kebab-case | `/reinitialiser-otp` |
| Error codes | SCREAMING_SNAKE_CASE | `COMPTE_BLOQUE`, `OTP_INVALIDE` |
| Audit actions | SCREAMING_SNAKE_CASE | `CONNEXION`, `DOCUMENT_UPLOADE` |

### Module Codes
Use consistent codes in `audit_logs.module` and route prefixes:
`M1` `M2` `M3` `M4` `M5` `M6` `M7` `M8` `M9` `M10`

## Language Policy

- **Server code**: French variable/function names where they match domain concepts (`lister`, `creer`, `utilisateur`, `matricule`)
- **Client code**: French for domain terms, English for React/framework terms (`useState`, `handleSubmit`, `navigate`)
- **UI text**: French (primary), with EN translations in `i18n/` namespace files
- **Comments**: French for business logic, English for technical explanations
- **Error messages returned to client**: French (users speak French)
- **Error codes (thrown internally)**: SCREAMING_SNAKE_CASE English shorthand

## Reference Auto-Generation

| Module | Format | Example |
|--------|--------|---------|
| Accords | `ACC-YYYY-XXXX` | `ACC-2026-0001` |
| Courriers | `CORR-YYYY-XXXX` | `CORR-2026-0042` |

Implement in service, not controller. Pad with zeros to 4 digits.

## File Organization (Client)

```
src/
├── components/           Reusable across pages
│   ├── ui/               Primitive shadcn-style (Button, Input, Label, ...)
│   └── layouts/          Layout shells (Layout.tsx)
├── hooks/                Custom hooks (useDocuments, useOrganisations, ...)
├── lib/                  Utilities + API (axios, *.api.ts, utils.ts)
├── i18n/                 Translation files
└── pages/                One folder per page, co-located helpers
    ├── LoginPage.tsx      (small pages: single file)
    └── documents/         (larger pages: folder)
        ├── DocumentsPage.tsx
        ├── schemas.ts
        └── components/
```

## CSS / Styling

- **Always** use ANAC design tokens (`bg-anac-navy`, not `bg-[#1B2A5E]`)
- **Prefer** Tailwind utilities over custom CSS
- **Only** add to `@layer components` for multi-property, frequently-reused patterns
- **Never** use inline `style={{}}` except for truly dynamic values (e.g., animated width percentages)
- **Dark mode**: not planned — ANAC LAN internal tool, fixed light theme

## TypeScript

- **Always** type function parameters and return values explicitly in server code
- **Prefer** `interface` over `type` for object shapes, `type` for unions/primitives
- **Never** use `any` — use `unknown` with type guards, or `Record<string, unknown>`
- **Import types** with `import type { Foo }` for type-only imports

## Path Aliases

| Package | Alias | Resolves to |
|---------|-------|-------------|
| `@sicot/client` | `@/` | `packages/client/src/` |
| `@sicot/server` | `@/` | `packages/server/src/` |

- **Always** use `@/` for cross-module imports on both client and server
- **Keep** same-directory imports (`./documents.types`) as relative — they don't benefit from the alias
- **Server note**: `tsc-alias` rewrites `@/` in compiled output (`dist/`) so `node dist/index.js` works in prod

## Git

- Commit message format: `type(scope): description`
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`
  - Scopes: `auth`, `client`, `server`, `shared`, `db`, `audit`, etc.
- Branch: stay on `main` for now (solo dev)
- Push after each significant feature/fix is stable
