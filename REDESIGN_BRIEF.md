# Breathe Pickleball — "Bold & Sporty" Redesign Brief

A complete from-scratch visual redesign. The previous UI read as generic/"AI-made":
too much frosted glass, soft glows, gradient soup, and timid type. Replace that
energy everywhere with a **bold, athletic, confident sports brand** look while
keeping 100% of existing functionality, data flow, props, and routes intact.

## The look (what "redesigned" means here)
- **Big, tight, heavy type.** Headlines are large with negative tracking. Use the
  `.heading-xl` / `.heading-lg` utilities. Eyebrows are uppercase + tracked.
- **Solid colour blocks, crisp edges.** Prefer solid `bg-ink`, `bg-brand`,
  `bg-lime` panels and `.card-sport` (defined 2px border) over frosted glass.
  Drastically reduce `liquid-glass`, `blur-3xl` glow orbs, and bg-gradient soup.
- **Lime is structural, not a glow.** Use lime as blocks, underlines (`.mark-lime`),
  tape stripes (`.tape-stripe`), the eyebrow tick — never as a blurry halo.
- **Real depth & motion (pickleball theme).** Use the signature `<PaddleScene>` 3D
  paddle/ball, scroll reveals, hover lift (`.lift-3d` / `.card-3d`), and tasteful
  framer-motion. Every page should have at least one piece of motion or 3D.
- **High contrast, generous spacing, strong hierarchy.** Sections feel designed,
  not stacked. Alternate light and dark (`bg-ink`) sections for rhythm.

## Design-system API (already defined in app/globals.css — USE THESE)
- `.eyebrow` — uppercase label with a lime tick (add `.text-lime` on dark bg).
- `.heading-xl`, `.heading-lg` — heavy, tight display headings (clamp-sized).
- `.mark-lime` — wrap a word: skewed lime highlight behind it.
- Buttons: `.btn-primary` (brand), `.btn-accent` (lime/ink), `.btn-dark`,
  `.btn-outline`. All chunky, uppercase, with a pressable shadow.
- `.card-sport` — crisp bordered card with hover lift (light + dark aware).
- `.tag-sport` — small pill tag.
- `.tape-stripe` — diagonal lime/ink "court tape" stripe (use as thin dividers/edges).
- Existing helpers still available: `.lift-3d`, `.card-3d`, `.text-gradient-brand`,
  `.animate-ball-bounce`, `.animate-paddle-swing`, `.min-h-screen-safe`.

## Shared components (import & reuse — do NOT edit these files)
- `@/components/ui/paddle-scene` → `<PaddleScene size={number} faceFrom faceTo />`
  the signature 3D paddle+ball. Use as a hero accent. Defaults to brand blue;
  pass `faceFrom="#c6f432" faceTo="#9bbd18"` for a lime paddle.
- `@/components/ui/page-hero` → `<PageHero label title subtitle>{cta}</PageHero>`
  bold dark marketing header with the paddle. Use on every secondary marketing page.
- `@/components/ui/portal-hero` → `<PortalHero eyebrow title subtitle right>{children}</PortalHero>`
  for dashboard/admin headers.
- `@/components/motion/scroll-reveal` → `<ScrollReveal>` wrap sections to fade/rise in.
- `@/components/motion/tilt-card`, `@/components/motion/stat-counter` — reuse as-is.
- `@/components/ui/court-pattern-bg` → `<CourtPatternBg className stroke />` court lines.

## Colour tokens (tailwind)
- `brand` (#2F5BFF family), `ink` (#0D1426 — the dark base), `lime` (#C6F432 / lime-dark),
  `slatey`. Dark mode is class-based (`dark:`) — every screen MUST look right in both.

## Hard rules (do not break the app)
1. **Only change presentation.** Keep all imports, props, exports, hooks, fetch
   calls, state, handlers, route params, and server/client boundaries identical.
   Do not rename exports other files import.
2. Keep `"use client"` / server directives as they are.
3. Keep the existing **Logo** component and the logo image — never redesign the logo.
4. Preserve accessibility: alt text, aria-labels, focus states, button semantics.
5. Respect reduced motion (the system utilities already do).
6. **Do NOT run** `next build` or any `git` command. Verify types with
   `npx tsc --noEmit` only (read-only). Leave committing to the orchestrator.
7. Do NOT edit shared/foundation files: `app/globals.css`, `tailwind.config.ts`,
   `app/layout.tsx`, `components/ui.tsx`, `components/ui/page-hero.tsx`,
   `components/ui/portal-hero.tsx`, `components/ui/paddle-scene.tsx`,
   `components/motion/*`. Only edit the files assigned to you.

## Definition of done for each page
- Clearly, dramatically different from before (no leftover glassy timid sections).
- Strong hero/header, confident type, at least one motion/3D moment.
- Works in light AND dark mode, mobile AND desktop.
- `npx tsc --noEmit` shows no new errors from your files.
