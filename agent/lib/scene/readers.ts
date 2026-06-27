import type { SceneRawRows, SceneScope } from "../../../shared/tools/scene.ts";
import {
  PROJECTION_BRIDGE_TIMEOUT_MS,
  bridgeReadSceneRows,
  resolveUiRoot,
} from "../projection-bridge.js";

export interface SceneReaders {
  readRows(scope: SceneScope): Promise<SceneRawRows>;
}

export function resolveRuntimeUrl(): string | undefined {
  const explicit = process.env.DREAM_MACHINE_RUNTIME_URL?.trim();
  if (explicit) return explicit;
  if (process.env.DREAM_MACHINE_RUNTIME_SHELL_ONLY === "1") return undefined;
  return process.env.BETTER_AUTH_URL?.trim();
}

function httpReaders(baseUrl: string): SceneReaders {
  return {
    async readRows(scope) {
      const token = process.env.DREAM_MACHINE_RUNTIME_TOKEN?.trim();
      const url = `${baseUrl.replace(/\/+$/, "")}/projection`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROJECTION_BRIDGE_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ mode: "rows", scope: scope ?? {} }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`runtime responded ${res.status} ${res.statusText}`);
        }
        const parsed = (await res.json()) as SceneRawRows & { error?: string };
        if (typeof parsed.error === "string" && parsed.error) {
          throw new Error(parsed.error);
        }
        const { error: _ignored, ...rows } = parsed;
        return rows as SceneRawRows;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function readersWithShellFallback(primary: SceneReaders, fallback: SceneReaders): SceneReaders {
  return {
    async readRows(scope) {
      try {
        return await primary.readRows(scope);
      } catch {
        return fallback.readRows(scope);
      }
    },
  };
}

/** Direct python bridge — shell fallback when HTTP runtime is unavailable. */
export const bridgeReaders: SceneReaders = {
  readRows: bridgeReadSceneRows,
};

/** HTTP-first when `DREAM_MACHINE_RUNTIME_URL` (or `BETTER_AUTH_URL`) is set; shell on failure. */
export function createSceneReaders(): SceneReaders {
  if (process.env.DREAM_MACHINE_RUNTIME_SHELL_ONLY === "1") {
    return bridgeReaders;
  }
  const url = resolveRuntimeUrl();
  if (!url) return bridgeReaders;
  return readersWithShellFallback(httpReaders(url), bridgeReaders);
}

// Re-export for tests and path diagnostics.
export { resolveUiRoot };