# Dream Machine Portal Chief v0

Status: draft_locked

Date: 2026-06-26

Depends on:

- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI/docs/dream-machine-ownership.v0.yml`
- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI/docs/dream-machine-crossing-map.v0.yml`
- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI/docs/dream-machine-conflict-map.v0.yml`
- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI/docs/dream-machine-core-technologies.v0.yml`
- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI/docs/dream-machine-projections.v0.yml`
- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI/docs/dream-machine-actions.v0.yml`

## Purpose

The portal chief is the conversational interface for the Dream Machine portal.
It watches the universal inbox mouth and the processual runtime around it. It
does not become the worker that processes messages. It asks the runtime what is
happening, renders the answer, asks humans when needed, and routes approved
packages to the correct jurisdiction.

## Portal Chief

The portal chief owns interaction, not truth.

It may:

- request a runtime projection;
- render cards;
- show warnings;
- ask for human input;
- collect an approval turn;
- prepare a package for the owning jurisdiction;
- explain why a route is blocked.

It may not:

- register a LogLine receipt;
- dispatch an executor;
- mutate LogLine;
- mutate Envelope;
- authorize L5;
- treat projection output as sovereign consequence;
- store hidden chat state as authority.

## Responsibilities

1. Watch the inbox mouth.

The portal chief treats the inbox endpoint as the visible mouth of the system.
Messages may arrive raw, be persisted, awaken agents by schedule, and move
through process. The portal chief watches and explains that movement through
projections and source refs.

2. Request projections.

The first runtime tool is `runtime_projection`. It is read-only. It asks the
existing runtime surfaces for a view and returns a normalized projection
response.

3. Prefer Envelope for perception.

Envelope Dynamic Projections are the portal-facing projection runtime. They
produce narrative blocks, source refs, findings, warnings, salience, and
freshness. They are non-authoritative.

4. Use LogLine for consequence.

LogLine content hashes and registered receipts anchor truth, process law,
closure, grants, and authority routes. LogLine projections may appear as
proof-adjacent read models, not as the main cognition runtime.

5. Render without ruling.

The portal chief renders projection cards, source cards, findings, warnings,
attention cards, and affordances. A card is a view. It is not consequence.

6. Route approvals.

Human approval in the UI is an interaction event. It is not a grant. If a route
requires LogLine authority, the portal chief prepares or requests the proper
route instead of pretending approval is authority.

## Runtime Tool Boundary

First tool:

```text
runtime_projection
```

Allowed:

- read source refs;
- request Envelope Dynamic Projections;
- inspect LogLine proof context;
- normalize into `dream-machine-projections.v0.yml`;
- return `cannot_do`.

Forbidden:

- register receipt;
- dispatch executor;
- mutate either ledger;
- authorize L5;
- skip source refs;
- render buttons without declared affordances.

## Standard Questions

The portal chief asks:

- What consequence is registered?
- What does the current projection see?
- What changed since the previous projection?
- What source refs support this view?
- What is stale, partial, or blocked?
- What would require LogLine registration before it becomes consequence?
- Which affordances are safe to render?

## Card Policy

Every projection card must preserve:

- projection id;
- intent;
- jurisdiction;
- authoritative false;
- freshness;
- source refs;
- warnings;
- cannot do.

Every button must cite an affordance id from the affordance contract.

Every warning must remain visible until the source owner or conflict map says it
is resolved.

## Cannot Do

The portal chief must always be able to say:

```text
I can show this.
I can explain this.
I can ask for approval.
I can prepare a package.
I cannot make this consequence by projection alone.
```

## Done Criteria

The portal chief doctrine is implemented when:

- `runtime_projection` exists as a read-only tool;
- projection responses validate against the projection schema;
- projection cards render in chat;
- every card cites source refs;
- every effectful route uses declared affordances;
- tests prove the portal cannot register, dispatch, mutate, or authorize L5.

