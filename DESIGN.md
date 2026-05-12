---
name: Forest & Found
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#40493d'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#707a6c'
  outline-variant: '#bfcaba'
  surface-tint: '#1b6d24'
  primary: '#0d631b'
  on-primary: '#ffffff'
  primary-container: '#2e7d32'
  on-primary-container: '#cbffc2'
  inverse-primary: '#88d982'
  secondary: '#596055'
  on-secondary: '#ffffff'
  secondary-container: '#dee5d6'
  on-secondary-container: '#5f665b'
  tertiary: '#1d622b'
  on-tertiary: '#ffffff'
  tertiary-container: '#387b41'
  on-tertiary-container: '#c7ffc5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a3f69c'
  primary-fixed-dim: '#88d982'
  on-primary-fixed: '#002204'
  on-primary-fixed-variant: '#005312'
  secondary-fixed: '#dee5d6'
  secondary-fixed-dim: '#c2c9bb'
  on-secondary-fixed: '#171d14'
  on-secondary-fixed-variant: '#42493e'
  tertiary-fixed: '#abf4ac'
  tertiary-fixed-dim: '#90d792'
  on-tertiary-fixed: '#002107'
  on-tertiary-fixed-variant: '#07521d'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is built to facilitate trust and organization within an educational environment. The brand personality is dependable, approachable, and highly legible, ensuring students and staff can navigate the stress of lost property with ease. 

The style is **Modern Corporate**, leaning into heavy whitespace and a "Soft Minimalist" aesthetic. It prioritizes clarity over ornamentation, using subtle green accents to provide a sense of growth and environmental stewardship. The interface should feel like a helpful digital concierge—quiet, efficient, and welcoming.

## Colors

The palette is rooted in a **Primary Forest Green**, symbolizing reliability and the school's identity. 

- **Primary:** Forest Green (#2e7d32) is used for high-importance actions, navigation headers, and success states.
- **Background:** Soft White (#f8f9fa) reduces glare compared to pure white, providing a comfortable canvas for long-term reading.
- **Surface:** Pure White (#ffffff) is reserved for cards, modals, and input areas to create distinct visual layers.
- **Text:** Dark Charcoal (#121212) ensures maximum contrast and readability, meeting AAA accessibility standards.
- **Accents:** Use subtle linear gradients moving from Forest Green to a slightly lighter Emerald for decorative elements or progress indicators.

## Typography

This design system utilizes **Inter** for all roles to maintain a systematic, utilitarian feel. The hierarchy relies on substantial weight differences (Bold vs. Regular) rather than decorative font changes. 

- **Headlines:** Use tighter letter-spacing for larger sizes to maintain a modern, punchy look.
- **Body Text:** Standard spacing for maximum legibility in item descriptions.
- **Labels:** Used for metadata like "Date Found" or "Category," often paired with the secondary green background for high visibility.

## Layout & Spacing

The layout follows a **Fixed Grid** model on desktop, centering content within a 1200px container. On mobile, it transitions to a fluid single-column layout.

- **Grid:** 12-column grid for desktop, 8-column for tablet, and 4-column for mobile.
- **Rhythm:** An 8px base unit governs all padding and margins. 
- **Reflow:** On mobile devices, side-by-side cards (e.g., item listings) should stack vertically or shift to a horizontal scrollable list to preserve image clarity.

## Elevation & Depth

This design system uses **Ambient Shadows** to create a sense of tactile hierarchy without visual clutter. Surfaces should feel like light cardstock resting on a soft table.

- **Level 1 (Default):** Subtle 1px light grey border (#e0e0e0) with no shadow. Used for static content.
- **Level 2 (Interactive):** Diffused shadow (y: 4px, blur: 12px, opacity: 0.05, color: #121212). Used for clickable item cards.
- **Level 3 (Floating):** Deeper shadow (y: 8px, blur: 24px, opacity: 0.08). Reserved for modals and dropdown menus.
- **Tonal Layering:** The #f8f9fa background acts as the lowest layer, while #ffffff surfaces indicate the primary interaction zone.

## Shapes

The shape language is **Rounded**, conveying a student-friendly and modern tone. 

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Content sections and main item cards use a 1rem (16px) radius to emphasize the "soft" brand character.
- **Buttons:** Primary buttons can occasionally use a pill-shape (full rounding) for a more approachable feel in mobile views.

## Components

- **Buttons:** Primary buttons feature solid Forest Green with white text. Secondary buttons use a Forest Green outline with a subtle light-green hover state (#f1f8e9).
- **Cards:** Item cards should feature a prominent image area (aspect ratio 4:3), a "headline-sm" title, and a "label-sm" status badge (e.g., "Claimed" in grey, "Available" in green).
- **Input Fields:** Soft White (#ffffff) background with a 1px border (#dee2e6). On focus, the border thickens and changes to Forest Green with a subtle outer glow.
- **Chips/Badges:** Small, high-rounded elements used for categories (e.g., "Electronics", "Clothing"). Use a #f1f8e9 background with Forest Green text.
- **Status Indicators:** Use a pulse animation for "Just Found" items to draw attention without being intrusive.
- **Progress Steppers:** For the claiming process, use a linear green gradient line connecting circular icons to guide the student through the workflow.