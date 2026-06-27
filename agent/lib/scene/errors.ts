import type { SceneOp } from "../../../shared/tools/scene.js";

export const UNIMPLEMENTED_SCENE_OPS = [] as const satisfies readonly SceneOp[];

const UNIMPLEMENTED_SET = new Set<string>(UNIMPLEMENTED_SCENE_OPS);

export class SceneOpNotImplementedError extends Error {
  readonly op: SceneOp;

  constructor(op: SceneOp) {
    super(`Scene op not implemented in v0: ${op}`);
    this.name = "SceneOpNotImplementedError";
    this.op = op;
  }
}

export function assertSceneOpImplemented(op: SceneOp): void {
  if (UNIMPLEMENTED_SET.has(op)) {
    throw new SceneOpNotImplementedError(op);
  }
}