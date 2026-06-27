import { defineTool } from "eve/tools";
import { z } from "zod";
import { SCENE_OPS } from "../../shared/tools/scene.js";
import { assembleScene } from "../lib/scene/scene.js";
import { normalizeSceneProjection } from "../lib/scene/normalize.js";
import { bridgeReaders } from "../lib/scene/readers.js";

const inputSchema = z.object({
  op: z.enum(SCENE_OPS).describe("The Scene operation. Start with scene.open."),
  goal: z.string().optional().describe("Natural-language objective; drives salience (e.g. 'what is stuck and waiting on me')."),
  scope: z.record(z.string(), z.unknown()).default({}).describe("What the Scene is about: { ledger, process, process_id, content_hash, stream_id }."),
  parent_projection_hash: z.string().optional(),
  selection: z.object({ filter: z.string().optional(), group_by: z.string().optional(), focus: z.string().optional() }).optional(),
  as_of: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

export default defineTool({
  description:
    "Read-only Dynamic Projection Scene over the LogLine + Envelope ledgers. Ask with a `goal`; get a bounded ProcessView (process state + andamento), honest loss accounting, and the legal next moves to drill. Never registers receipts, dispatches, mutates a ledger, or authorizes L5 — effectful intents come back as `proposals` for the airlock.",
  inputSchema,
  async execute(input) {
    try {
      const scene = await assembleScene(input as never, bridgeReaders, { now: Date.now() });
      const normalized = normalizeSceneProjection(scene);
      return {
        ok: true as const,
        scene,
        projection: normalized.ok ? normalized.response : undefined,
        notes: normalized.notes,
      };
    } catch (err) {
      return {
        ok: false as const,
        reason: "projection_unavailable" as const,
        errors: [{ field: "runtime", message: err instanceof Error ? err.message : String(err) }],
        cannot_do: ["register_receipt", "dispatch_executor", "authorize_l5", "mutate_ledger"],
      };
    }
  },
});