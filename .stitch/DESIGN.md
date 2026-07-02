# ComboDiet — Design System

**Active system: Ethos & Harvest** (Restorative Minimalist). Tokens from `design_system/combodiet/DESIGN.md` and Diet Explorer mock in `design_system/combodiet_diet_explorer/code.html`.

Source of truth for implementation: `styles.css` and `index.html` at the repo root.

## Design personality

Calm, supportive, and clarity-focused. Warm cream backgrounds, sage green (Ethos) accents, terracotta (Harvest) callouts, Manrope typography, white cards with soft ambient shadows, and rounded Material-style surfaces. Caregiver-focused copy — not clinical or alarming.

## Ethos & Harvest color tokens

Defined as CSS custom properties on `:root` in `styles.css`.

| Token | Value | Role |
| --- | --- | --- |
| `--background` / `--surface` | `#fbf9f4` | Page background (warm cream) |
| `--surface-container-lowest` | `#ffffff` | Card surfaces |
| `--surface-container` | `#f0eee9` | Secondary surfaces, diet cards |
| `--surface-container-high` | `#eae8e3` | Elevated tints (DASH card) |
| `--on-surface` | `#1b1c19` | Primary text |
| `--on-surface-variant` | `#434842` | Secondary/body text |
| **Ethos (primary)** | | |
| `--primary` | `#47614a` | Sage green — brand, headings, primary actions |
| `--on-primary` | `#ffffff` | Text on primary |
| `--primary-container` | `#5f7a61` | Featured card gradients, badges |
| `--primary-fixed` | `#cceacc` | Selected chip fill, overview accent |
| `--secondary-container` | `#dbe2d9` | Secondary panels, advanced toggle |
| **Harvest (tertiary)** | | |
| `--tertiary` | `#745445` | Terracotta — destructive text, counts |
| `--tertiary-fixed` | `#ffdbcc` | Safety/note callouts |
| `--outline-variant` | `#c3c8bf` | Input borders, dashed states |

### Shadows

- `--shadow-card`: `0 4px 20px rgba(71, 97, 74, 0.04)` — Level 1 cards
- `--shadow-ambient`: `0 10px 30px rgba(71, 97, 74, 0.08)` — hover / interactive elevation

## Typography

| Use | Stack | Notes |
| --- | --- | --- |
| All text | `"Manrope", "Segoe UI", sans-serif` | Loaded from Google Fonts (Ethos & Harvest spec) |
| Icons | Material Symbols Outlined | Header, cards, buttons |

Scale (CSS variables):

- Display (`h1`): `clamp(2rem, 4.5vw, 3rem)`, weight 600–700
- Headline lg (`h2`): `clamp(1.5rem, 3vw, 2rem)`
- Headline md (`h3`, diet names): `1.5rem`
- Body lg: `1.125rem` — hero lead
- Body md: `1rem` — default
- Label md: `0.875rem`, weight 600 — buttons, form labels
- Caption: `0.75rem` — kickers, metadata

Kickers (`.eyebrow`, `.section-label`): uppercase, caption size, secondary color, wide letter-spacing.

## Layout — Diet Explorer (primary)

Single-column page flow (not hero + side-by-side workspace):

1. Sticky header — ComboDiet wordmark
2. Explorer hero — eyebrow + "Diet Explorer" title + caregiver copy + medical disclaimer
3. Advanced Mode / Combine Rules toggle (UI preview, disabled)
4. Blood type chips
5. Diet bento grid (12-column desktop):
   - Mediterranean featured (8 cols) with gradient visual
   - Keto compact (4 cols)
   - DASH (5 cols) with thumb
   - Healthy Vegetarian accent (7 cols)
   - Pescetarian / Semi-Vegetarian (6 cols each)
   - Blood Type reference (dashed, full width)
   - Food Combining baseline row (dashed, full width)
6. Conditions panel (Step 1–2)
7. Results panel (Step 3)
8. Quote section

Container max-width: `1200px`, gutter: `24px`. Breakpoint: `980px` — single column collapse.

## Components

### Header (`.app-header`)

Sticky top bar with ComboDiet brand (explore icon + wordmark) and data exports link.

### Diet cards (`.diet-bento`)

Bento-style selectable cards. Hidden `<input type="checkbox">` inside `<label>`. Selected state via `:has(input:checked)`.

### Advanced toggle (`.advanced-toggle`)

UI preview for "Combine Rules" / Food Combining overlay. Toggle disabled — not wired to app logic.

### Food Combining baseline (`.food-combining-baseline`)

Informational row at bottom of bento — not a diet checkbox.

### Buttons

Minimum height 48px. Pill shape (`--radius-full`). Primary = Ethos sage; secondary = secondary-container.

## Voice & content

- Product name: **ComboDiet**
- User-focused copy (your care team, oncologist, dietitian)
- Medical disclaimers in Harvest terracotta callouts
- localStorage keys remain `convergence-health-*` for backward compatibility

## Mock references

`design_system/combodiet_diet_explorer/code.html` is the primary layout reference.

**Not yet implemented:** bottom nav bar, desktop side nav dots, Food Combining toggle logic, mock hero photography (CSS gradients used instead).

## Prior tokens (superseded)

Original Convergence teal/serif palette and early ComboDiet hero+workspace split are replaced by Ethos & Harvest + Diet Explorer layout.
