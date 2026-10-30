---
name: Kinetic Performance
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c5c9b0'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8f937c'
  outline-variant: '#454936'
  surface-tint: '#b0d434'
  primary: '#ffffff'
  on-primary: '#293500'
  primary-container: '#cbf150'
  on-primary-container: '#566c00'
  inverse-primary: '#516600'
  secondary: '#d1beef'
  on-secondary: '#372950'
  secondary-container: '#50426b'
  on-secondary-container: '#c2b0e0'
  tertiary: '#ffffff'
  on-tertiary: '#670024'
  tertiary-container: '#ffd9dd'
  on-tertiary-container: '#b53354'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cbf150'
  primary-fixed-dim: '#b0d434'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#ebdcff'
  secondary-fixed-dim: '#d1beef'
  on-secondary-fixed: '#21143a'
  on-secondary-fixed-variant: '#4e4068'
  tertiary-fixed: '#ffd9dd'
  tertiary-fixed-dim: '#ffb2bd'
  on-tertiary-fixed: '#400013'
  on-tertiary-fixed-variant: '#8c1037'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-metric:
    fontFamily: Space Grotesk
    fontSize: 38px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system establishes an energetic, high-performance athletic dark UI calibrated for iOS. Combining deep charcoal architecture with high-voltage electric accents, the aesthetic bridges elite sports training and intelligent fitness technology. 

Key attributes:
- **Athletic Precision:** High-contrast surfaces, razor-sharp geometric typography, and punchy quantitative readouts.
- **Dynamic Voltage:** Purposeful dual-accent pairing—electric lime for active momentum and progress milestones; soft lavender for structural balance, routine categories, and recovery metrics.
- **Photo-Forward Physicality:** Cutout athletic imagery integrated directly into fluid, high-radius contextual workout cards.
- **Modern Hardware Refinement:** Fluid floating capsules, pill ergonomics, and frictionless iOS touch targets that feel responsive under physical strain.

## Colors

The palette is engineered around an ultra-dark slate base to maximize contrast during active workout conditions and conserve OLED power.

- **Canvas & Surfaces:**
  - Base canvas: `#121212` (deep obsidian charcoal).
  - Elevated cards & containers: `#1A1A1A` with subtle structural dividers in `#2A2A2A`.
  - Secondary elevated layer: `#242424` for internal sub-cards, nested chips, and calendar rings.
- **High-Voltage Accents:**
  - Primary Electric Lime (`#D8FF5C`): Highlights completion states, active session timers, calorie burning vectors, and interactive tab indicators. All foreground typography layered directly on lime defaults to `#121212`.
  - Secondary Pastel Lavender (`#C3B1E1`): Used for routine categorizations, muscle group targeting tags, and secondary metric visualizations. Typography over lavender defaults to `#121212`.
  - Destructive Crimson (`#FF6B8A`): Reserved exclusively for workout cancellation, heart-rate critical zone alerts, and destructive actions.
- **Typography & Structural Contrast:**
  - Primary text: `#FFFFFF`.
  - Secondary / Supporting metadata: `#A3A3A3`.
  - Floating Dock: Pure white `#FFFFFF` capsule with deep charcoal `#121212` icons and colored indicator pads.

## Typography

The type system pairs the angular, athletic posture of **Space Grotesk** with the fluid legibility of **Plus Jakarta Sans**. 

- **Display & Metrics (`Space Grotesk`):** Delivers distinct sports-tech character to timers, rep counts, and calories burned. Tight tracking (`-0.02em` to `-0.03em`) creates a dense, performance-driven digital readout.
- **Headlines & Section Titles (`Space Grotesk`):** Clean, confident headers ensure immediate scannability during motion.
- **Body & Secondary Copy (`Plus Jakarta Sans`):** Provides warm, open humanist geometry for workout descriptions, exercise instructions, and multi-line coaching tips.
- **Labels & Micro-data:** Uppercase labels use expanded tracking (`+0.04em` to `+0.08em`) to guarantee quick recognition on small mobile targets.

## Layout & Spacing

Designed around a native iOS single-column flow with responsive 4-column sub-grids for metric pairs and calendar rails.

- **Canvas Architecture:** Standard mobile padding uses `1.25rem` (20px) horizontal safe margins. Cards span the full safe width or divide symmetrically into 50% split pairs with `1rem` (16px) gutters.
- **Vertical Rhythm:** Components stack with `1.25rem` or `1.75rem` breathing room between distinct groups. Micro-elements inside metric tiles maintain compact `0.25rem` to `0.5rem` gaps.
- **Viewport Insets:** Cards clear the native iOS dynamic island and status bar by `3.25rem`. The bottom margin accounts for the floating capsule navigation bar by introducing a `6rem` bottom clearance zone on all scroll containers.

## Elevation & Depth

Visual hierarchy uses crisp surface tonal staging rather than heavy drop shadows:

- **Level 0 (Canvas):** Pure `#121212`, recessive foundation.
- **Level 1 (Default Containers):** `#1A1A1A` with a hairline stroke (`1px solid #2A2A2A`). No shadow.
- **Level 2 (Hero Accent Cards):** Solid color fills in `#D8FF5C` or `#C3B1E1` resting flat on `#121212`, commanding immediate visual priority without blur layers.
- **Level 3 (Interactive Floating Dock):** Solid `#FFFFFF` background elevated with a focused directional anchor shadow: `0px 12px 32px rgba(0, 0, 0, 0.45)`.
- **Level 4 (In-Workout Floating Controls):** Bottom-anchored white or deep charcoal sheets with an upper border radius of `28px` and subtle dark scrim backdrop.

## Shapes

The geometry uses hyper-rounded corner architecture balancing large-radius structural cards with fully rounded pill capsules.

- **Cards & Primary Blocks:** Fixed corner radius of `24px` to `28px`.
- **Pills, Badges & Navigation:** Pill geometry (`9999px`) applied to all filters, segmented controls, status indicators, and the floating navigation dock.
- **Action Buttons & Inputs:** Uniformly pill-shaped (`9999px`) for touch ergonomics.
- **Image Cutouts & Inset Avatars:** Hero athlete photography breaks out of card boundaries or sits nested within circular masks (`9999px`).

## Components

### Buttons
- **Primary Kinetic Action:** Full-width or inline pill (`9999px`), background `#D8FF5C`, text `#121212` (`label-lg`), height `56px`. Pressed state scales down smoothly to `0.97`.
- **Secondary Tone:** Background `#242424`, border `1px solid #2A2A2A`, text `#FFFFFF`.
- **Accent Soft:** Background `#C3B1E1`, text `#121212`.

### Segmented Controls & Chips
- **Container:** Dark track `#1A1A1A` with `1px solid #2A2A2A`, height `44px`, pill-shaped.
- **Active Filter:** White `#FFFFFF` pill fill with `#121212` bold typography.
- **Inactive Filter:** Transparent fill with `#A3A3A3` typography.

### Workout & Plan Cards
- **Hero Accent Format:** Full solid fill in Electric Lime or Soft Lavender with `#121212` text. Houses exercise duration, calorie badges, and an athlete cutout anchoring the right side.
- **Dark Metric Format:** `#1A1A1A` fill, `#2A2A2A` hairline border. Left side features workout title and targeted muscle tags; right side features rounded badge chips indicating duration (e.g., "30 mins").

### Metric Badges & Timers
- **Workout Timer Display:** High-contrast layout with large display numerals (`display-metric`, Space Grotesk) centered within an elevated white bottom sheet during active mode.
- **Circular Progress Rings:** Multi-segment donut rings pairing `#D8FF5C`, `#C3B1E1`, and `#2A2A2A` tracking tracks.

### Floating Tab Bar
- **Shell:** Pure `#FFFFFF` pill capsule hovering `1.5rem` above the bottom safe area. Width `280px` to `320px`, height `64px`.
- **Tab Items:** Charcoal `#121212` iconography. Active tab features a solid `#C3B1E1` or `#D8FF5C` circle (`42px` diameter) centered behind the active glyph.