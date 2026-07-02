---
name: ComboDiet
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#434842'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#737971'
  outline-variant: '#c3c8bf'
  surface-tint: '#4a654d'
  primary: '#47614a'
  on-primary: '#ffffff'
  primary-container: '#5f7a61'
  on-primary-container: '#efffec'
  inverse-primary: '#b1ceb1'
  secondary: '#596059'
  on-secondary: '#ffffff'
  secondary-container: '#dbe2d9'
  on-secondary-container: '#5d645d'
  tertiary: '#745445'
  on-tertiary: '#ffffff'
  tertiary-container: '#8e6c5c'
  on-tertiary-container: '#fffaf8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cceacc'
  primary-fixed-dim: '#b1ceb1'
  on-primary-fixed: '#07200e'
  on-primary-fixed-variant: '#334d36'
  secondary-fixed: '#dde4db'
  secondary-fixed-dim: '#c1c8c0'
  on-secondary-fixed: '#171d18'
  on-secondary-fixed-variant: '#424942'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#e8beac'
  on-tertiary-fixed: '#2c160b'
  on-tertiary-fixed-variant: '#5d4032'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  caption:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-max: 1200px
  gutter: 24px
---

## Brand & Style

This design system embodies a **Restorative Minimalist** aesthetic, tailored for a health and nutrition context that prioritizes clarity, calm, and ease of use. The brand personality is supportive and clean, aiming to reduce the cognitive load often associated with dietary tracking and meal planning.

The visual style leans heavily into **Modern Minimalism** with a touch of **Tonal Layering**. It avoids harsh clinical whites in favor of a soft, organic palette that evokes freshness and vitality. The interface should feel breathable, using generous white space (or rather, "cream space") to guide the user's focus toward their nutritional goals without creating a sense of urgency or guilt.

## Colors

The palette is rooted in nature and wellness. 
- **Primary (Sage Green):** Used for key actions, active states, and brand emphasis. It is a muted, sophisticated green that feels professional yet organic.
- **Secondary (Soft Sage):** A desaturated, lighter version of the primary used for secondary buttons, subtle highlights, and large background surfaces.
- **Tertiary (Warm Terracotta):** A soft, earthy accent used sparingly for highlights, progress indicators, or specific nutritional callouts.
- **Neutral (Warm Cream):** The foundation of the system. This replaces pure white to provide a softer, more premium reading experience that reduces eye strain.

## Typography

The design system utilizes **Manrope** across all levels to maintain a modern, technical, yet highly legible appearance. Manrope’s geometric qualities paired with its open apertures make it ideal for data-heavy nutritional information while appearing contemporary and fresh.

- **Headlines:** Use tighter letter spacing and semi-bold weights to create a strong visual anchor.
- **Body:** Standard weight with generous line height to ensure maximum readability during long-form content like recipes or health articles.
- **Labels:** Slightly increased tracking and semi-bold weights help differentiate interactive elements and metadata from body text.

## Layout & Spacing

The design system follows a **Fluid Grid** model based on an 8px square system. 

- **Desktop:** A 12-column grid with 24px gutters and 48px side margins. Content is centered with a max-width of 1200px.
- **Tablet:** An 8-column grid with 16px gutters and 24px side margins.
- **Mobile:** A 4-column grid with 16px gutters and 16px side margins.

Vertical rhythm is maintained by using 16px (md) as the default spacing between related elements and 48px (xl) for section-level separation. This ensures a "roomy" feel that aligns with the restorative brand philosophy.

## Elevation & Depth

To maintain the minimalist and calming aesthetic, depth is created primarily through **Tonal Layers** and extremely soft **Ambient Shadows**.

- **Level 0 (Base):** The Warm Cream background (#F9F7F2).
- **Level 1 (Surface):** Subtle white or slightly tinted containers used to group content. These use a very soft 20px blur shadow at 4% opacity of the Primary Sage color to feel grounded rather than floating.
- **Level 2 (Interactive):** Elements like active cards or modals use a slightly more pronounced shadow and a 1px border of the Secondary color to define boundaries without adding visual clutter.

Avoid high-contrast drop shadows or complex gradients. The goal is to simulate a soft, natural light source.

## Shapes

The design system employs **Rounded** corners to evoke a sense of friendliness and approachability. 

- **Standard Buttons/Inputs:** 0.5rem (8px) radius.
- **Cards/Sections:** 1rem (16px) radius to create a soft, containerized look.
- **Search Bars/Chips:** 1.5rem (24px) or full "pill" shapes are preferred for these smaller, discrete interactive elements to distinguish them from structural content containers.

## Components

- **Buttons:** Primary buttons use a solid Sage Green fill with white text. Secondary buttons use an outline of Sage Green or a soft Soft Sage fill with Primary text. All buttons have a minimum height of 48px to be touch-friendly.
- **Cards:** Cards are the primary vessel for information. They feature a white background, 16px corner radius, and the Level 1 subtle ambient shadow.
- **Input Fields:** Use a 1px border of the Secondary color. On focus, the border transitions to Primary Sage with a soft 2px outer glow.
- **Chips:** Used for dietary tags (e.g., "Keto," "Vegan"). These are pill-shaped with a light Secondary color background and Primary color text.
- **Lists:** Clean, borderless lists with 16px of vertical padding between items. Dividers should be very subtle (Secondary color at 50% opacity).
- **Progress Bars:** For tracking macros or calories, use the Tertiary Terracotta for the fill and a pale version of the Secondary color for the track.