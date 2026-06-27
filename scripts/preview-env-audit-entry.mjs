import { auditPreviewEnv } from "../server/utils/preview-env-guard.ts";

process.stdout.write(`${JSON.stringify(auditPreviewEnv())}\n`);