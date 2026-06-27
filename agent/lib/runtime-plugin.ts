// T-P1 public API — the one packaged Dream Machine runtime projection seam.
// Import from here instead of reaching into bridge/portal modules directly.

export {
  PROJECTION_BRIDGE_TIMEOUT_MS,
  bridgeReadLegacyProjection,
  bridgeReadSceneRows,
  fetchProjectionRuntime,
  handleProjectionPost,
  hasLocalLedger,
  isRowsProjectionBody,
  preferredJurisdiction,
  resolveEnvelopeDbPath,
  resolveLoglineDbPath,
  resolveRuntimeUrl,
  resolveUiRoot,
  type LegacyProjectionRequest,
  type ProjectionPostBody,
} from "./projection-bridge.js";

export {
  mapRuntimeProjection,
  normalizeBridgeProjection,
  type ProjectionMapInput,
} from "./projection-portal.js";

export { createSceneReaders } from "./scene/readers.js";
export { assembleScene } from "./scene/scene.js";
export { normalizeSceneProjection } from "./scene/normalize.js";