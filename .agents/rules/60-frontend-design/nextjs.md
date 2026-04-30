---
id: frontend-design.nextjs
name: Next.js Skill Alignment
description: Follow installed Vercel agent skills for Next.js and React work.
summary: >
  Apply this rule when changing Next.js apps, App Router files, server/client components, route
  handlers, middleware, Next config, React performance, or Vercel runtime behavior.
status: active
priority: 61
severity: high
scope:
  match:
    any:
      - packageDependency: next
      - fileExists: next.config.*
      - fileGlob: apps/**/next.config.*
      - fileGlob: apps/**/src/app/**
      - fileGlob: "**/app/**"
      - fileGlob: "**/middleware.ts"
      - userTrigger: next
      - userTrigger: nextjs
      - userTrigger: app-router
      - userTrigger: server-component
      - userTrigger: route-handler
requires:
  - core.agent-behavior
  - dev-runtime.portless
  - env-and-secrets.env-adapters
  - frontend-design.design-contract
conflictsWith: []
supersedes: []
owner: web
lastReviewed: 2026-04-30
---

# Next.js

## Required

- Use the repo-local Vercel Labs skills when relevant:
  `.agents/skills/vercel-react-best-practices/SKILL.md`,
  `.agents/skills/vercel-composition-patterns/SKILL.md`, and
  `.agents/skills/web-design-guidelines/SKILL.md`.
- Preserve the App Router shape already used by the target app unless the user explicitly requests a
  router migration.
- Keep server/client boundaries explicit. Add `"use client"` only for interactive components,
  browser APIs, state, effects, or event handlers.
- Apply Vercel React/Next.js performance guidance for data fetching, bundle boundaries, route
  handlers, Suspense, dynamic imports, and server-side request state.
- Keep local app URLs and API base values domain-based through portless, not raw localhost ports.
- Follow the env adapter rule for all runtime configuration used by Next.js code.

## Forbidden

- Do not introduce Pages Router files into an App Router app unless the migration is explicit.
- Do not add direct `process.env` reads outside the app env adapter boundary.
- Do not use `localhost:{port}` for browser access, API calls, OAuth redirects, or examples.
- Do not create shared mutable module state in RSC/SSR paths for request-scoped data.
- Do not use broad barrel imports or non-analyzable dynamic paths when direct imports are available.

## Allowed Exceptions

- Framework-internal listeners, automated tests, and tool-generated values may use raw ports when
  they do not become user-facing URLs or application API base values.
