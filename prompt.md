You are acting as a Senior Frontend Engineer, UX/UI Architect, Product Usability Specialist, and Public-Surface Security Reviewer.

Your task is to perform a focused final refinement pass on the SICOT External Portal.

Repository:
https://github.com/fredpatch/sicot-monorepo.git

Primary frontend location:
packages/client

Attached references:

1. Current implemented portal screenshot
2. Approved portal visual direction
3. Official ANAC Gabon logo asset

This is NOT a redesign from scratch.

The current portal is already functionally correct and visually much improved.

Your job is to polish the remaining UX/UI issues, strengthen the institutional/public identity, reduce unnecessary visual bulk, and harden edge cases.

Do not modify backend contracts unless a real blocker is discovered.

Do not commit or push changes.

---

# 1. Working mode

Work incrementally.

Use:

✅ Done
⏳ Current
🔜 Next

Follow this sequence:

1. Audit the current implemented portal
2. Compare it with the attached references
3. Report the remaining UX/UI issues
4. Propose a concise refinement plan
5. Implement only the agreed frontend refinements
6. Validate responsive behavior and edge cases
7. Return a final report

Do not start coding before returning the refinement plan.

---

# 2. Functional behavior that must remain untouched

Preserve:

- public unauthenticated `/portal`
- server-side search
- category filtering
- real category counts
- pagination
- public document listing
- PDF preview
- image preview
- unsupported MIME fallback
- email-based secure download request
- tokenized download links
- token duration display
- publication boundary
- public metadata minimization
- current public API contracts
- current security rules

Do not break working behavior for visual changes.

---

# 3. Main goals of this refinement

Improve:

1. Hero branding
2. Category-card density
3. Category interaction state
4. Search/hero integration
5. Public document-list hierarchy
6. Long filename handling
7. Empty/filter states
8. Download UX wording
9. Public accessibility
10. Public edge cases

The portal should feel like an official ANAC public resource library, not an internal admin page.

---

# 4. Official ANAC logo

Use the provided official ANAC Gabon logo asset.

Do not:

- redraw it
- recolor it
- stylize it
- approximate it with SVG
- alter its proportions
- recreate it manually

Use the original asset.

Preferred use:

## Header

Small institutional logo:

~40–48px high

beside:

SICOT
ANAC Gabon

or equivalent current portal branding.

## Hero

Use the main ANAC emblem as the decorative/public identity anchor.

Target desktop height:

~90–120px

Target mobile:

~70–90px

The logo must replace the current generic globe/document decorative illustration.

Do not make it oversized.

Keep sufficient whitespace around it.

---

# 5. Certification banner asset

A second provided image contains:

ANAC logo
Bureau Veritas
ISO 9001
UKAS certification marks

Do NOT use this as the primary portal logo.

It may only be used in a secondary area such as:

- footer
- institutional information section

and only if appropriate to existing ANAC public branding.

If there is no clear need, omit it.

Do not distort certification marks.

---

# 6. Hero refinement

Current hero is much better but can be more polished.

Recommended desktop structure:

[ANAC LOGO]

Bienvenue sur le portail documentaire SICOT

Consultez les documents publiés et autorisés
pour diffusion externe par l’ANAC Gabon.

Aucun compte SICOT n’est requis.

                                      [ À propos de ce portail ]

[ 🔍 Rechercher un document........................................... ]

Requirements:

- Keep hero compact.
- Do not increase current vertical height.
- ANAC logo should strengthen identity without dominating.
- Search should remain integrated into hero.
- “À propos” stays secondary.

Avoid decorative clutter.

---

# 7. Hero typography hierarchy

Ensure hierarchy is:

1. Portal title
2. Public-purpose sentence
3. “No account required” helper
4. Search

The ANAC logo is branding, not the main heading.

Do not make the logo compete with the title.

---

# 8. Category cards — reduce height

Current category cards are still slightly too large.

Reduce overall card height by approximately:

20–25%

Target roughly:

130–150px desktop

depending on typography.

Do not use excessive empty space.

---

# 9. Category-card layout

Place icon and title on the same first row.

Preferred structure:

┌────────────────────────────┐
│ [icon] Accords │
│ │
│ Accords et conventions │
│ publiés. │
│ │
│ 12 documents → │
└────────────────────────────┘

Requirements:

- icon ~28–32px container
- title beside icon
- description beneath
- count + arrow aligned on bottom row
- vertically compact
- consistent heights

Do not place icon alone on a large row above the title.

---

# 10. Category-card active state

Clicking a category filters the document list.

Make this interaction explicit.

Selected category should have:

- slightly stronger border
- subtle tinted background
- clear visual emphasis
- accessible selected state

Use:

aria-pressed

or equivalent semantic state.

Do not rely only on color.

---

# 11. Zero-document categories

Categories with zero results must remain handled.

Preferred:

- remain visible
- slightly muted
- still selectable
- show `0 document`

Do not disable them unless there is a product reason.

Clicking one should show the filtered empty state correctly.

---

# 12. “Toutes les catégories”

Provide an obvious reset mechanism.

Recommended options:

Option A:
compact “Toutes les catégories” chip/button above cards

or

Option B:
first compact category card

Choose whichever fits the existing layout best.

When active:

all documents display.

---

# 13. Search behavior

Preserve current server-side search.

Ensure:

- search remains visually integrated into hero
- search field uses most available width
- field height ~48–52px
- clear focus state
- search resets pagination to page 1

If category is selected:

search should normally remain active within that category.

Do not automatically clear search when switching category unless necessary.

---

# 14. Filter reset behavior

Provide one clear way to reset:

search +
category

Suggested action:

Réinitialiser

or

Afficher tous les documents

Do not create multiple competing reset buttons.

---

# 15. Documents section heading

Improve orientation.

Instead of only:

Documents disponibles (5)

use something like:

Documents disponibles

5 documents

If category active:

Documents disponibles
Accords · 5 documents

If search active:

Résultats
5 documents

Keep concise.

---

# 16. Document list appearance

Current direction is acceptable.

Polish it further as a public resource list.

Keep:

- light table header
- generous rows
- clear filename
- restrained metadata
- blue public action button

Do not revert to internal SICOT DataTable styling.

---

# 17. Filename handling

Long filenames are a real edge case.

Implement:

- truncation or line clamp
- preserve row width
- no layout shift
- full filename available via accessible tooltip/title
- keyboard users must also be able to access full text

Do not let a filename push actions off-screen.

---

# 18. Technical filenames

Some current files have generated names like:

rapport-analytics-2026-07-04-1783163799519.pdf

Do not invent friendly titles.

Use the actual filename.

But improve readability:

- filename primary
- MIME type secondary
- stable truncation

Future public-title metadata may be recommended separately.

---

# 19. Language display

Current missing language shows:

—

Acceptable on desktop.

For mobile/detail contexts prefer:

Non précisée

if space permits.

Do not invent language detection here.

---

# 20. Date semantics

Current data is `createdAt`.

Keep table label:

Date

Do not rename to:

Date de publication

unless backend adds a real `publishedAt`.

---

# 21. Actions

Keep:

Consulter
Recevoir le lien

This wording is correct.

Do not change back to:

Télécharger

because the user does not immediately download.

Visual hierarchy:

Consulter
→ secondary

Recevoir le lien
→ primary SICOT blue

Avoid black buttons.

---

# 22. Action responsiveness

On narrower screens:

actions should not crush the filename.

Tablet:
compact buttons or menu if needed.

Mobile:
actions move to card footer.

Do not force desktop table actions into tiny widths.

---

# 23. Secure download dialog

Keep current secure email flow.

Recommended wording:

Title:
Obtenir le lien de téléchargement

Body:
Saisissez votre adresse email.
Un lien sécurisé vous sera envoyé pour télécharger ce document.

Field:
Adresse email

Primary:
Envoyer le lien

Success:
Lien envoyé

Consultez votre boîte email.

If duration exists:

Le lien sera valable pendant X jours.

Do not say the file has already downloaded.

---

# 24. Email validation edge cases

Handle:

- empty email
- malformed email
- surrounding whitespace
- uppercase domains
- API validation error
- server rejection
- request already pending
- repeated clicks

Trim input before submission.

Do not rely only on:

email.includes('@')

Use proper schema/browser validation aligned with backend.

---

# 25. Duplicate token requests

Prevent accidental duplicates.

While token request is pending:

- disable primary action
- show progress state
- prevent repeated submission

After success:

do not allow immediate duplicate send from the same dialog unless intentionally reset.

Backend rate limiting remains the real protection.

---

# 26. Email-success correctness

Only display:

Lien envoyé

if backend confirms the email operation succeeded.

If backend only creates token but email fails:

show an error.

Do not present false success.

Audit current API semantics.

---

# 27. Unsupported preview MIME

Audit MIME handling.

Expected:

application/pdf
→ PDF viewer

image/*
→ image viewer

Other:

DOCX
XLSX
ZIP
text types if unsupported

→ friendly fallback:

Aperçu non disponible pour ce type de fichier.

[ Recevoir le lien ]

Do not attempt to render arbitrary non-image files with `<img>`.

---

# 28. Preview failure

If preview endpoint fails:

Show:

Impossible d’afficher ce document.

Vous pouvez demander un lien sécurisé pour le télécharger.

Actions:

Recevoir le lien
Fermer

Do not leave blank iframe/black screen.

---

# 29. Withdrawn document edge case

Scenario:

1. visitor loads public list
2. admin withdraws document
3. visitor clicks Consult or Receive Link

Expected:

backend rejects access

UI:

Ce document n’est plus disponible sur le portail.

Refresh/remove it from current list where practical.

Do not show internal status.

---

# 30. Expired secure link

If public download route handles expired tokens:

Ensure public error state is clear:

Ce lien de téléchargement a expiré.

Retournez sur le portail pour demander un nouveau lien.

Do not expose raw token details.

---

# 31. Empty portal state

If there are zero published documents globally:

Do not show:

seven zero-category cards +
empty table

as the only experience.

Use a stronger global empty state:

Aucun document public n’est disponible pour le moment.

Les documents publiés par l’ANAC apparaîtront ici.

Category cards may be hidden or heavily simplified in this state.

---

# 32. Filtered empty state

When documents exist globally but selected category/search has no results:

Show:

Aucun document ne correspond à votre recherche.

If category active:

Aucun document disponible dans cette catégorie.

Provide reset action.

Do not use the global-empty message.

---

# 33. Pagination edge cases

Ensure:

- category change → page 1
- search change → page 1
- clearing filters → page 1
- page greater than new `totalPages` never leaves user on an empty page
- deleted/withdrawn docs do not leave invalid pagination state

---

# 34. Category count consistency

Category counts must represent real public documents.

Do not calculate counts only from the current page.

Audit current implementation.

Counts should come from:

- backend aggregates
- or a complete public category-count response

If currently derived incorrectly, report before changing API.

---

# 35. Responsive category behavior

Desktop:
5 cards per row if space allows.

Tablet:
2–3 cards per row.

Mobile:
prefer 2 compact columns
or horizontally scrollable cards.

Do not stack seven large cards vertically.

---

# 36. Mobile document cards

On mobile replace table with cards.

Each card:

Filename
Category
Language
Date
Size

[ Consulter ]
[ Recevoir le lien ]

Keep touch targets >=44px where practical.

---

# 37. Accessibility

Verify:

- category cards are buttons/links
- active category exposed semantically
- logo has appropriate alt text
- purely decorative elements use empty alt/aria-hidden
- search has visible label or accessible name
- truncated filenames remain accessible
- viewer close button labelled
- download dialog focus trapped/restored
- email errors associated with field
- status messages announced
- pagination keyboard accessible
- actions do not depend on icon only

---

# 38. ANAC logo accessibility

If logo is informative:

alt="ANAC Gabon"

If adjacent text already fully conveys it and logo is decorative:

alt=""

Choose one intentionally.

Do not duplicate screen-reader text unnecessarily.

---

# 39. Footer

Keep footer simple and institutional.

Recommended:

ANAC Gabon
SICOT

© 2026 ANAC Gabon. Tous droits réservés.

Only include:

Mentions légales
Confidentialité
Contact

if those routes/pages really exist.

Do not create dead links.

---

# 40. Visual details

Use:

- ANAC navy
- SICOT blue
- light gray/blue page background
- white cards
- subtle border
- restrained shadow
- compact radius consistency
- consistent icon sizing

Avoid:

- heavy gradients
- black CTA buttons
- giant empty sections
- admin-style navy table headers

---

# 41. Do not over-design

The current version is already structurally correct.

Do NOT:

- rewrite the whole portal
- change routes
- change API contracts
- introduce new public metadata
- add partner/country filters
- add fake descriptions
- add fake publication dates
- add login/signup
- add internal navigation
- add a large custom SVG if the official ANAC logo already provides the needed identity

The goal is refinement, not another redesign.

---

# 42. Security regression checks

Reconfirm:

- only published documents appear
- unpublished direct IDs rejected server-side
- withdrawn documents rejected
- download tokens scoped correctly
- no internal metadata exposed
- no OCR text exposed
- no uploader exposed
- no filesystem paths exposed
- email token generation remains rate-limited if backend supports it

Report missing server-side protections.

Do not simulate security client-side.

---

# 43. Performance

Keep:

- server pagination
- debounced search
- lazy preview
- no document preview preload
- no token request before user action

Optimize official logo asset:

- use appropriate source file
- avoid unnecessary huge raster dimensions
- preserve quality
- avoid layout shift

If needed, create an optimized web asset from the provided logo without visually altering it.

Do not change branding content.

---

# 44. Testing

Validate at least:

## Desktop

1920×1080
1440×900

## Tablet

1024px class viewport

## Mobile

390px class viewport

Test:

- all categories
- zero-count category
- active category
- search only
- search + category
- reset
- long filename
- missing language
- PDF
- image
- unsupported MIME
- preview failure
- valid email
- invalid email
- send success
- send failure
- repeated click
- withdrawn document
- no documents globally
- filtered empty result
- pagination after filter change

Also run:

TypeScript
ESLint
Production build

Do not claim a check passed unless executed.

---

# 45. Expected final report

Return:

1. Remaining UX issues found
2. Files modified
3. ANAC branding integration
4. Hero refinements
5. Category-card refinements
6. Category active/reset behavior
7. Document-list refinements
8. Filename handling
9. Download-flow refinements
10. Preview edge cases
11. Empty states
12. Responsive changes
13. Accessibility changes
14. Security checks
15. Validation commands
16. Validation results
17. Remaining future recommendations

Start with the audit/refinement plan only.

Do not write implementation code until that plan is returned.
