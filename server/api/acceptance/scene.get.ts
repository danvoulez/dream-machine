import { acceptanceEnabled, assembleAcceptanceScene } from "~~/server/utils/acceptance";

export default defineEventHandler(async () => {
  if (!acceptanceEnabled()) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  try {
    const output = await assembleAcceptanceScene();
    return {
      ok: true as const,
      output,
      processCount: output.scene.loss_accounting.total_candidates,
      visibleCount: output.scene.loss_accounting.visible_count,
    };
  } catch (err) {
    throw createError({
      statusCode: 503,
      statusMessage: err instanceof Error ? err.message : "Scene assembly failed",
    });
  }
});