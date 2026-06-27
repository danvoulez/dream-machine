import type { SceneRawRows, SceneScope } from "../../../shared/tools/scene.ts";
import {
  bridgeReadSceneRows,
  fetchProjectionRuntime,
  resolveUiRoot,
} from "../projection-bridge.js";

export interface SceneReaders {
  readRows(scope: SceneScope): Promise<SceneRawRows>;
}

/** Direct python bridge — used when HTTP runtime is unavailable. */
export const bridgeReaders: SceneReaders = {
  readRows: bridgeReadSceneRows,
};

/** HTTP-first when runtime URL is configured; shell fallback on failure. */
export function createSceneReaders(): SceneReaders {
  if (process.env.DREAM_MACHINE_RUNTIME_SHELL_ONLY === "1") {
    return bridgeReaders;
  }
  return {
    async readRows(scope) {
      const parsed = await fetchProjectionRuntime({ mode: "rows", scope: scope ?? {} });
      const { error: _ignored, ...rows } = parsed;
      return rows as SceneRawRows;
    },
  };
}

export { resolveUiRoot };