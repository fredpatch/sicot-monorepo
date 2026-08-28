// packages/client/src/lib/docs/article.schema.ts
//
// Typed contract for a long-form help article (Phase 10.3). Frontmatter is
// repository-controlled Markdown, not user input, but it's still parsed
// text - validated with zod (already a dependency) rather than blindly cast,
// per the Phase 10.3 brief. Deliberately excludes persisted roles: the only
// visibility axis is `capability`, resolved through hasCapability() like
// everywhere else in the authorization model, never a role array.
import { z } from 'zod';
import { ROLE_CAPABILITIES, type Capability } from '@sicot/shared';

// role-capabilities.ts composes each tier additively, so super_admin's list
// is exactly the full, current set of capabilities that exist - reusing it
// here avoids hand-maintaining a second copy of the Capability literal list
// just to validate frontmatter at runtime.
const KNOWN_CAPABILITIES = new Set<string>(ROLE_CAPABILITIES.super_admin);

// One directory per category (docs/user-guide/<category>/) - extend this
// list only when a real article set for a new category is added, not ahead
// of time (Phase 10 audit's "don't scaffold empty categories" rule).
export const ARTICLE_CATEGORIES = [
  'getting-started',
  'personal-workspace',
  'translation',
  'missions',
  'documents',
  'cooperation',
  'administration',
] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const ArticleFrontmatterSchema = z.object({
  slug: z.string().regex(slugPattern, 'slug must be kebab-case (lowercase, digits, hyphens)'),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  category: z.enum(ARTICLE_CATEGORIES),
  relatedRoutes: z.array(z.string()).default([]),
  relatedArticles: z.array(z.string()).default([]),
  capability: z
    .string()
    .refine((v) => KNOWN_CAPABILITIES.has(v), { message: 'unknown capability' })
    .transform((v) => v as Capability)
    .optional(),
  reviewedAt: z.string().optional(),
});

export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatterSchema>;

export interface Article extends ArticleFrontmatter {
  /** Raw Markdown body, frontmatter stripped. */
  content: string;
}
