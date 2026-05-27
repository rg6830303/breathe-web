---
name: Cyber-Athletic Performance
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c3c5d8'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#8d90a1'
  outline-variant: '#434655'
  surface-tint: '#b5c4ff'
  primary: '#b5c4ff'
  on-primary: '#00287d'
  primary-container: '#2a66ff'
  on-primary-container: '#fcfaff'
  inverse-primary: '#0050e3'
  secondary: '#ecffad'
  on-secondary: '#293500'
  secondary-container: '#bfea00'
  on-secondary-container: '#526700'
  tertiary: '#c2c6da'
  on-tertiary: '#2b303f'
  tertiary-container: '#6e7385'
  on-tertiary-container: '#fcfaff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b5c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#003baf'
  secondary-fixed: '#c7f317'
  secondary-fixed-dim: '#add500'
  on-secondary-fixed: '#171e00'
  on-secondary-fixed-variant: '#3d4d00'
  tertiary-fixed: '#dee2f6'
  tertiary-fixed-dim: '#c2c6da'
  on-tertiary-fixed: '#161b2a'
  on-tertiary-fixed-variant: '#424657'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-xl:
    fontFamily: Anybody
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Anybody
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Anybody
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Anybody
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

This design system embodies a high-octane, "Cyber-Athletic" aesthetic designed for the modern pickleball competitor. The brand personality is aggressive, energetic, and premium, blending the intensity of professional sports with the futuristic polish of high-end gaming interfaces. 

The visual style utilizes **Glassmorphism** and **High-Contrast Bold** elements. Expect deep translucent layers, vibrant neon accents that mimic court lines under stadium lights, and a sense of physical depth created through layered 3D components and interactive micro-states. The goal is to evoke a sense of "performance-ready" digital equipment.

## Colors

The palette is anchored by **Midnight Cyber Navy**, serving as a deep, expansive base for both light and dark modes. In dark mode, this provides the necessary contrast for the **Electric Court Blue** and **Neon Volt Green** to "pop" as if self-illuminated.

- **Primary (Electric Court Blue):** Used for primary actions, progress indicators, and core branding.
- **Accent (Neon Volt):** Reserved for success states, critical highlights, and "gamified" achievement markers.
- **Neutrals:** Pure White is used for maximum legibility on headlines, while Slate Gray provides hierarchy for metadata and secondary body text.

In Light Mode, the system flips to a high-contrast white base while maintaining the neon accents through vibrant borders and subtle color-tinted shadows to preserve the energetic DNA.

## Typography

The typographic system relies on a "Fast and Clean" hierarchy. 

**Anybody** is the display powerhouse. It is always used in its boldest weights and specifically in **Italic** for headlines to convey forward motion, speed, and competitive urgency. 

**Plus Jakarta Sans** provides the functional balance. It is used for all interactive UI elements, body copy, and data visualizations. This ensures that while the headers feel "loud" and athletic, the actual utility of the app remains highly legible and sophisticated. Use wide letter-spacing and uppercase transformations for labels to reinforce the technical, "HUD" (Heads-Up Display) aesthetic.

## Layout & Spacing

The design system utilizes a **Fluid Grid** based on an 8px square rhythm. This ensures alignment across various device types while maintaining the density expected of a performance-tracking application.

- **Desktop:** 12-column grid with generous 64px outside margins to create a "premium" focus on center-stage content.
- **Mobile:** 4-column grid with tight 16px margins to maximize screen real estate for action-oriented lists and maps.

Vertical rhythm should be aggressive—use larger gaps (`lg` or `xl`) between major content sections to allow the glassmorphic cards to breathe and "float" over the background.

## Elevation & Depth

Depth is not communicated via traditional drop shadows but through **Backdrop Blurs** and **Luminescent Inner Glows**.

1.  **Level 0 (Base):** Midnight Cyber Navy background.
2.  **Level 1 (Cards):** Semi-transparent (12% opacity) surface with a 20px backdrop blur and a 1px "Neon" stroke (#2A66FF at 20% opacity).
3.  **Level 2 (Floating/Active):** Increased transparency (20%), a sharper 1px border using the Neon Volt Green (#D2FF2A), and a subtle outer glow (bloom) of the same color to indicate interactivity.

This stacking creates a "multi-layered glass" effect that feels tactile yet digital.

## Shapes

The shape language uses **Rounded (0.5rem)** corners as the standard. This strikes a balance between the "sharpness" of technical/geometric design and the "softness" required for modern mobile apps.

- **Standard Elements:** 0.5rem (8px) radius.
- **Large Containers/Cards:** 1rem (16px) radius.
- **Interactive Pills/Buttons:** Full "Pill" radius (3rem) for high-touch areas, creating a distinctive contrast against the rectangular grid-heavy layouts.

## Components

### Buttons
- **Primary:** Solid Electric Court Blue with white bold text. On hover, add a Neon Volt outer glow.
- **Secondary/Ghost:** Transparent background with a 2px Neon Volt border and italicized text.

### Cards
Cards should feel like "Glass Panels." Use a consistent 1px stroke (Court Blue) and a 16px blur. Content within cards should follow a strict internal padding of `md` (24px).

### Input Fields
Dark Navy backgrounds with a bottom-only border in Slate Gray. Upon focus, the border animates into a full-surround Electric Blue stroke with a subtle inner glow.

### Chips & Status Indicators
Small, high-contrast badges. Success states use Neon Volt Green with black text for maximum "vibe" and visibility. Match-ready or "Live" indicators should feature a subtle "breathing" pulse animation in the Primary Blue.

### Gamified Progress Bars
Use a thick 12px track. The "unfilled" portion is the base navy; the "filled" portion is a gradient from Electric Blue to Neon Volt, suggesting energy and completion.