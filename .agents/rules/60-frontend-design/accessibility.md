---
id: frontend-design.accessibility
name: Accessibility Discipline
description: Apply the vendored accessibility skill for interactive UI, forms, dialogs, and reviews.
summary: >
  Apply this rule when changing interactive controls, forms, validation states, dialogs, focus
  management, keyboard behavior, semantic markup, or UI accessibility reviews.
status: active
priority: 63
severity: high
scope:
  match:
    any:
      - fileGlob: apps/**/src/**/*.tsx
      - fileGlob: packages/design-system/**
      - fileGlob: packages/ui-primitives/**
      - userTrigger: accessibility
      - userTrigger: a11y
      - userTrigger: wcag
      - userTrigger: form
      - userTrigger: dialog
requires:
  - frontend-design.design-contract
  - frontend-design.shadcn-composition
conflictsWith: []
supersedes: []
owner: design-system
lastReviewed: 2026-04-30
---

# Accessibility

## Required

- Use `.agents/skills/fixing-accessibility/SKILL.md` when changing interactive UI, forms, dialogs,
  menus, validation states, keyboard behavior, or accessibility reviews.
- Prefer native semantic elements before ARIA roles.
- Ensure every interactive control has an accessible name.
- Keep keyboard access, visible focus, dialog focus trapping, and focus restoration intact.
- Connect form errors and helper text to their controls with the appropriate ARIA attributes.
- Combine this rule with shadcn and design-system rules when composing shared UI components.

## Forbidden

- Do not use `div` or `span` as interactive controls when `button`, `a`, `input`, or another native
  element fits.
- Do not hide focus states or make interactions hover-only.
- Do not add icon-only buttons without an accessible label.
- Do not skip heading levels or replace semantic structures with visual-only markup.

## Allowed Exceptions

- ARIA roles are acceptable when native semantics cannot express the widget, but the required ARIA
  attributes and keyboard behavior must be implemented together.
