---
name: Feature request
about: Propose a capability the template should ship.
title: "[feat] "
labels: enhancement
---

## What problem does this solve

<!-- One paragraph. Who hits this problem and how often? -->

## Proposed shape

<!-- The minimal change that solves the problem. Don't design the full system. -->

## Alternatives considered

<!-- Bullets. The point is to show the rejected options before committing. -->

-

## Scope check

- [ ] This belongs in the **template**, not in a downstream fork's product code.
- [ ] If shipping this as a new package or app, it crosses a runtime/contract boundary (per
      [docs/template-strategy.md](../../docs/template-strategy.md) "Avoid day-one overreach").
- [ ] If this is a real adapter (Redis, Kafka, queue, email), I have a real consumer in mind;
      otherwise it stays a memory/noop adapter.
- [ ] An ADR is warranted (see [docs/adr/](../../docs/adr/)) — yes / no / unsure.

## Notes

<!-- Related ADR numbers, prior issues, relevant external docs. -->
