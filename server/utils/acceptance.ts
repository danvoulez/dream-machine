import { assembleScene } from "../../agent/lib/scene/scene";
import { bridgeReaders } from "../../agent/lib/scene/readers";
import { normalizeSceneProjection } from "../../agent/lib/scene/normalize";
import type { SceneResponse } from "~~/shared/tools/scene";
import type { SceneOutput } from "~~/shared/utils/tools/scene";

export function acceptanceEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DREAM_MACHINE_ACCEPTANCE === "1";
}

export async function assembleAcceptanceScene(): Promise<SceneOutput & { scene: SceneResponse }> {
  const scene = await assembleScene(
    { op: "scene.open", goal: "quais são os processos e seus andamentos?", scope: { ledger: "lab" }, limit: 10 },
    bridgeReaders,
    { now: Date.now() },
  );
  const normalized = normalizeSceneProjection(scene);
  return {
    ok: true,
    scene,
    projection: normalized.ok ? normalized.response : undefined,
    notes: normalized.notes,
    cannot_do: ["register_receipt", "dispatch_executor", "authorize_l5", "mutate_ledger"],
  };
}