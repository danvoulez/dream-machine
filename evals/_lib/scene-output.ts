import type { SceneOutput } from "../../shared/utils/tools/scene.ts";

export function isValidSceneOutput(value: unknown): value is SceneOutput & { ok: true; scene: NonNullable<SceneOutput["scene"]> } {
  if (!value || typeof value !== "object") return false;
  const output = value as SceneOutput;
  if (output.ok !== true || !output.scene) return false;
  const total = output.scene.loss_accounting?.total_candidates ?? 0;
  const visible = output.scene.view?.items?.length ?? 0;
  return total >= 1 && visible >= 1;
}