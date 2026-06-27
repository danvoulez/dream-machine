# Dream Machine Portal Understanding

Status: working alignment note, not an implementation spec.

Date: 2026-06-26 (vocabulary-aligned 2026-06-27)

This document captures the current shared understanding for adapting the Vercel
Personal Agent Template into a Dream Machine portal. It is deliberately deep
enough to survive context loss, but it stops before runtime integration. The
runtime-facing contract is still being aligned.

> **Vocabulary note.** This note is governed by
> [`dream-machine-vocabulary.v0.yml`](dream-machine-vocabulary.v0.yml). The bare
> terms `candidate`, `admission`, `admitted`, and `act` are banned unqualified.
> LogLine is **registration + activation**, not a gate that admits or rejects:
> everything may register; only complete records matching a registered process
> contract activate. Where this note must name a primitive it uses the
> jurisdiction-qualified term (`logline_act`, `registered receipt`,
> `receipt_proposal`, `board_act`, `proposal`).

## Core Thesis

The portal is not the Dream Machine runtime, and its chief is not the agent that
processes every item.

The portal is the conversational operating surface for a processual runtime. It
helps the user navigate what entered, what became a `receipt_proposal`, what
registered, what activated, what is moving, what is waiting, and what needs human
intervention.

The chief's job is to deal with the portal and the runtime view:

- explain what the runtime currently shows;
- request purpose-built projections;
- surface valid actions as buttons or approval turns;
- preserve the boundary between observation, proposal, and consequence;
- avoid inventing truth from memory or conversational confidence.

The inbox is the mouth of the runtime. Whoever can watch the mouth can start to
watch the rest, but the portal should not remain limited to the inbox. It should
follow work as it becomes `receipt_proposal`s, registered `logline_act`s, queue
items, projections, ghosts, doubts, receipts, and process runs.

## Dream Machine Model

The Dream Machine is a processual, ledger-backed runtime. Its law is:

> Everything may register. Only complete records matching a registered process
> contract activate.

Registration is universal custody; activation is earned by form. There is no
gate — evaluation classifies, it does not reject.

The system has two connected halves.

### LogLine Ledger

The LogLine ledger is the authority side. It is narrow, canonical, append-only,
and governed by the registration-vs-activation law.

It contains the `logline_act`s that became truth-as-recorded the instant they
registered, and that activate consequence when their form matches a process
contract. The `logline_act` is the consequence unit. Process contracts,
activation, conformance, content hashes, receipts, grants, and evidence live
around this side.

The portal must treat registered, activated `logline_act`s as authoritative and
must not allow a UI row, chat summary, tool result, or memory entry to outrank
them.

### Envelope and Observability Ledger

The envelope side is the operational side. It carries ingress, custody, traces,
queue projections, runtime movement, adapter outputs, and observability.

This half is allowed to be noisy. It can contain raw arrivals, incomplete
material, traces, provisional state, pending queue items, and evidence that has
not yet become consequence.

The portal is strongly connected to this side because it is the human-readable
watch surface. But this side is not a second source of truth.

## How the Two Halves Connect

The two halves should connect as a membrane, not by merging into one ledger.

The dangerous shape would be two independent truths: an inbox table, queue table,
trace table, and `logline_act` table all separately deciding process status.

The better shape is a loop:

```text
world input
  -> envelope registers arrival, raw bytes, CAS references, traces
  -> sweeper or process proposes a receipt_proposal
  -> the record registers; form decides whether it activates
  -> a registered, activated logline_act enters the LogLine ledger
  -> selectors observe activated logline_acts
  -> queue, projections, and observability are rebuilt from authority
  -> executor and adapters produce evidence
  -> evidence is cited by new logline_acts or receipts
```

The connection points are content hashes, `receipt_proposal` references, receipt
IDs, evidence references, projection sources, queue source hashes, and process
IDs.

In portal language:

- Envelope ledger: what happened around truth.
- LogLine ledger: what registered and what became truth by activation.
- Projection layer: what the operator can see now.
- Portal chief: how the human navigates the relationship between those layers.

## Canyon and the Universal Inbox

Canyon is the mouth: the public ingress surface.

The portal can feel like a universal inbox, but the implementation should not
prematurely hardcode "inbox table equals truth." Earlier notes mention a standalone
`inbox` table; later conformance notes correct this direction toward raw bytes
into CAS plus a conformant registration `logline_act` through the runtime.

This matters for the Vercel portal:

- Do not bake a standalone inbox ontology into the app.
- Do not make the portal decide truth from raw arrival rows.
- Treat "inbox" as an operator projection over ingress and runtime state.
- Let the runtime decide whether an arrival is raw, a `receipt_proposal`, ghost,
  doubted, registered, activated, queued, processing, blocked, or closed.

The first real portal integration should therefore not be `listInbox`. It should
be a dynamic projection request.

## Dynamic Projections

Dynamic projections are the likely center of gravity for the portal.

The chief should not read raw ledgers like a human doing database archaeology. It
should request bounded, purpose-built projections from the runtime:

```text
Given this operator question,
and this slice of runtime state,
build the smallest useful view.
```

Projection examples:

- What entered through Canyon recently, and did anything light up?
- Why is this process waiting?
- Which activated `logline_act`s caused this queue item?
- What ghosts are accumulating?
- What L4 or L5 work is blocked on human signoff?
- What did the sweeper propose?
- What did the runtime leave inert (registered but non-activating)?
- What changed since the last check?

A projection should carry enough structure for both narration and UI rendering:

- summary;
- source references;
- status semantics;
- projection blocks;
- open findings;
- valid affordances;
- danger tier and authority requirements;
- freshness or as-of markers;
- links back to `logline_act`s, `receipt_proposal`s, queue items, traces,
  receipts, or evidence.

The agent should narrate projections. It should not infer runtime truth beyond
the projection's source material.

## Portal Chief Behavior

The chief is the portal's operator persona. It is not the authority. It is not a
replacement for the registration/activation law, conformance, selectors,
executor, or adapters.

It should:

- request projections when the user asks about runtime state;
- explain the distinction between raw registration, `receipt_proposal`,
  registered `logline_act`, activated consequence, queue projection, ghost,
  doubt, and closed receipt;
- surface human decisions only when the runtime projection exposes valid
  affordances;
- put dangerous or consequential actions behind explicit approval;
- treat L4 and L5 work as blocked unless the runtime exposes a valid signoff path;
- say when state is pending, stale, registered-but-inert, or merely observed;
- preserve uncertainty rather than forcing fake completion.

It should not:

- invent process state from conversation;
- treat memory as runtime truth;
- mutate runtime state through unapproved side effects;
- collapse envelope observations into activated `logline_act`s;
- present raw ingress as an assertion by the system;
- use a dashboard row as authority when a `logline_act` or receipt is required.

## What the Vercel Template Already Solves

The Personal Agent Template is useful because it is already chat-native and
runtime-native, not just a decorative chat box.

Reusable seams:

- Durable Eve chat sessions persist and resume thread state.
- Dynamic tool parts already render in the chat stream.
- Human-in-the-loop prompts are represented as `inputRequest` metadata and
  answered with `inputResponses`.
- Tool approval is already available through Eve's `needsApproval`.
- Custom tool cards already exist; `save_memory` is the pattern to copy for
  projection cards.
- Authorization prompts already appear as parked chat turns.
- Vercel Connect and Eve MCP connections are already used for Linear.
- Dynamic session instructions are injected at session start.
- Tool render routing is centralized in the chat message component.

This means the portal should reuse chat as the main operating surface. A separate
dashboard should wait until the runtime projection model asks for it.

## Recommended Future Integration Shape

The first serious runtime integration should be a projection tool, not a pile of
direct ledger queries.

Proposed tool:

```text
runtime_projection(intent, scope, filters)
```

Possible intents:

- `overview`
- `arrival_detail`
- `process_detail`
- `waiting_on_me`
- `ghosts`
- `dangerous_work`
- `recent_changes`
- `proposal_detail`
- `queue_detail`
- `act_trace`

The tool response should be structured so the frontend can render a custom
projection card. The card can show status, source references, blocks, warnings,
and available actions.

Actions should be separate, explicit, and approved where needed. For example:

- approve a `receipt_proposal` for registration;
- reject or doubt;
- request more evidence;
- retry a process;
- route to a worker;
- sign L4/L5 work;
- mark a wake as handled.

The agent can request the projection, explain it, and ask the user what to do.
The runtime remains the authority over which actions are valid.

## Current Stop-Line

Do not hack the Vercel template into a fake portal before the dynamic projection
contract is aligned.

Safe work before that alignment:

- rename and reframe the app;
- write the portal-chief doctrine;
- draft projection contracts;
- identify UI render patterns;
- create placeholder quick actions that start chat threads;
- document how Dream Machine concepts map to Eve tools and cards.

Unsafe or premature work:

- hardcoding an `inbox` table as truth;
- building a dashboard that assumes final runtime schema;
- inventing process status semantics in the UI;
- wiring direct ledger reads into the chief without projection boundaries;
- implementing irreversible runtime actions before approval and authority paths
  are explicit.

## Minimal Personalization Direction

When personalization is resumed, the app should shift from "V, personal agent" to
something like:

- Product: Dream Machine Portal
- Role: runtime portal chief
- Surface: chat-first operator console
- Main function: request and explain projections; surface valid interventions
- Boundary: never create consequence without registered, activated `logline_act`s
  and explicit authority

The app can still keep a simple home screen and chat prompt. The quick actions
should become runtime-oriented, for example:

- "What changed?"
- "Show waiting work"
- "Show ghosts"
- "Explain a process"
- "Show dangerous work"

Those quick actions can remain textual until `runtime_projection` exists.

## Open Decisions

- What is the official projection contract shape?
- Does Dream Machine expose projections through a first-party HTTP endpoint,
  an MCP server, or both?
- What are the stable projection intents for the first slice?
- What runtime references must every projection include?
- Which actions are purely observational, which are L1-L3, and which require
  L4/L5 human signoff?
- How should the portal authenticate to the runtime: app session, Vercel Connect,
  Supabase claim, LAB ID passport, or a bridge between them?
- Where does the portal store local thread state versus runtime state?

## One-Sentence North Star

The Dream Machine Portal is a chat-native operator surface where the chief asks
the runtime for dynamic projections, explains the relationship between envelope
observations and registered, activated `logline_act`s, and exposes only valid,
governed actions back to the human.
