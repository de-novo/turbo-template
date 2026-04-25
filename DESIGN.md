---
version: alpha
name: Fullstack TypeScript Template
description: Agent-readable design-system baseline for projects created from this template.
colors:
  primary: "#2563EB"
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  surface-muted: "#F1F5F9"
  text-primary: "#111827"
  text-secondary: "#475569"
  border: "#CBD5E1"
  accent: "#2563EB"
  accent-hover: "#1D4ED8"
  on-accent: "#FFFFFF"
  success: "#15803D"
  warning: "#B45309"
  danger: "#B91C1C"
typography:
  display:
    fontFamily: Geist
    fontSize: 2.25rem
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "0px"
  heading:
    fontFamily: Geist
    fontSize: 1.5rem
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "0px"
  body:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0px"
  label:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 550
    lineHeight: 1.35
    letterSpacing: "0px"
  mono:
    fontFamily: Geist Mono
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0px"
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 24px
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: 12px
  app-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 24px
  muted-panel:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: 16px
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: 8px
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: 8px
  status-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: 8px
---

# Design System: Fullstack TypeScript Template

## Overview

Products created from this template should start from a clear operational SaaS
baseline: quiet, structured, trustworthy, and fast to scan. The interface should
prioritize task completion, domain confidence, and precise state visibility over
decorative expression.

Use restrained surfaces, direct labels, compact spacing, and visible hierarchy.
The product should not feel like a marketing landing page inside the app.

## Colors

- **Canvas** (#F8FAFC) is the base application background.
- **Surface** (#FFFFFF) is used for panels, forms, tables, dialogs, and focused work areas.
- **Surface Muted** (#F1F5F9) is used for subtle grouping, disabled states, and secondary regions.
- **Text Primary** (#111827) is used for primary copy and important values.
- **Text Secondary** (#475569) is used for labels, descriptions, metadata, and helper text.
- **Border** (#CBD5E1) is used for structural dividers and input boundaries.
- **Accent** (#2563EB) is reserved for primary actions, focused controls, and selected states.
- **Success**, **Warning**, and **Danger** are semantic status colors only.

## Typography

Use Geist for product UI and Geist Mono for codes, IDs, timestamps, license keys,
numeric identifiers, logs, and dense operational values. Keep letter spacing at 0.
Use weight, color, and spacing for hierarchy instead of oversized typography.

Text inside compact panels, forms, tables, and sidebars must stay appropriately
small and readable. Reserve display typography for true page headers.

## Layout

Use dense but calm layouts. Prefer page shells with predictable navigation,
toolbar regions, filter rows, tables, forms, and detail panels. Avoid floating
cards inside cards. Page sections should be unframed layouts or full-width bands;
cards are for repeated items, modals, and genuinely bounded tools.

Mobile layouts collapse to a single column. Interactive targets should be at
least 44px tall where touch interaction is expected.

## Elevation & Depth

Prefer borders and background contrast over heavy shadows. Elevation should
communicate modal focus, popovers, and temporary overlays, not decorate every
surface. Shadows, when used, must be subtle and neutral.

## Shapes

Use 4px to 8px radii for dense controls and ordinary panels. Use 12px sparingly
for larger dialogs or focused work surfaces. Avoid pill-heavy UI unless the
control is a tag, status chip, or segmented filter.

## Components

Buttons should use familiar iconography when the action is common. Use text
buttons for clear commands and primary actions. Inputs use labels above the
field, helper text below when needed, and inline error messages below the field.

Tables should support scanning: stable row height, sticky headers when useful,
clear empty states, and consistent status chips. Loading states should preserve
layout dimensions with skeletons rather than generic spinners.

## Do's and Don'ts

Do:

- Use semantic tokens and status colors consistently.
- Keep operational screens compact, clear, and predictable.
- Use `packages/design-system` for service-owned components.
- Use `packages/ui-primitives` only as the primitive substrate.
- Update this file when the design language changes.

Don't:

- Do not use generic purple/blue gradient hero styling.
- Do not introduce decorative orbs, bokeh backgrounds, or neon glows.
- Do not use cards nested inside cards.
- Do not use oversized marketing typography for operational UI.
- Do not let app screens invent local colors, radii, typography scales, or component behavior.
