import { assertPreviewEnvSafe } from "../utils/preview-env-guard";

export default defineNitroPlugin(() => {
  assertPreviewEnvSafe();
});