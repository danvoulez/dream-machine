// C0.3 preview.seam — preview deployments must not carry write/commit authority.

export const PREVIEW_FORBIDDEN_ENV = [
  "DREAM_MACHINE_AIRLOCK_COMMIT_TOKEN",
  "DREAM_MACHINE_RUNTIME_COMMIT_TOKEN",
  "DREAM_MACHINE_RUNTIME_WRITE_TOKEN",
  "DREAM_MACHINE_PROPOSAL_COMMIT_TOKEN",
  "DREAM_MACHINE_EFFECT_COMMIT_TOKEN",
  "DREAM_MACHINE_LOGLINE_WRITE_TOKEN",
  "DREAM_MACHINE_LAB_COMMIT_TOKEN",
] as const;

const FORBIDDEN_RUNTIME_TOKEN_CLASSES = new Set(["write", "commit", "airlock", "effect", "proposal"]);

export type PreviewEnvViolation = {
  code: "forbidden_env" | "runtime_token_missing_class" | "runtime_token_forbidden_class";
  message: string;
  env?: string;
};

export function isVercelPreviewDeploy(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === "preview";
}

export function isVercelProductionDeploy(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === "production";
}

export function validatePreviewEnv(env: NodeJS.ProcessEnv = process.env): PreviewEnvViolation[] {
  if (!isVercelPreviewDeploy(env)) return [];

  const violations: PreviewEnvViolation[] = [];

  for (const name of PREVIEW_FORBIDDEN_ENV) {
    if (env[name]?.trim()) {
      violations.push({
        code: "forbidden_env",
        env: name,
        message: `Preview must not set ${name}`,
      });
    }
  }

  const tokenClass = env.DREAM_MACHINE_RUNTIME_TOKEN_CLASS?.trim().toLowerCase();
  if (tokenClass && FORBIDDEN_RUNTIME_TOKEN_CLASSES.has(tokenClass)) {
    violations.push({
      code: "runtime_token_forbidden_class",
      env: "DREAM_MACHINE_RUNTIME_TOKEN_CLASS",
      message: `Preview forbids DREAM_MACHINE_RUNTIME_TOKEN_CLASS=${tokenClass}`,
    });
  }

  const shellOnly = env.DREAM_MACHINE_RUNTIME_SHELL_ONLY === "1";
  const runtimeToken = env.DREAM_MACHINE_RUNTIME_TOKEN?.trim();
  if (runtimeToken && !shellOnly) {
    if (!tokenClass) {
      violations.push({
        code: "runtime_token_missing_class",
        env: "DREAM_MACHINE_RUNTIME_TOKEN_CLASS",
        message: "Preview with DREAM_MACHINE_RUNTIME_TOKEN requires DREAM_MACHINE_RUNTIME_TOKEN_CLASS=read",
      });
    } else if (tokenClass !== "read" && !FORBIDDEN_RUNTIME_TOKEN_CLASSES.has(tokenClass)) {
      violations.push({
        code: "runtime_token_forbidden_class",
        env: "DREAM_MACHINE_RUNTIME_TOKEN_CLASS",
        message: `Preview allows only DREAM_MACHINE_RUNTIME_TOKEN_CLASS=read; got ${tokenClass}`,
      });
    }
  }

  return violations;
}

export class PreviewEnvConfigError extends Error {
  violations: PreviewEnvViolation[];

  constructor(violations: PreviewEnvViolation[]) {
    super(violations.map((v) => v.message).join("; "));
    this.name = "PreviewEnvConfigError";
    this.violations = violations;
  }
}

/** Fail boot on preview deployments with forbidden write/commit authority. */
export function assertPreviewEnvSafe(env: NodeJS.ProcessEnv = process.env): void {
  const violations = validatePreviewEnv(env);
  if (violations.length > 0) {
    throw new PreviewEnvConfigError(violations);
  }
}

export function auditPreviewEnv(env: NodeJS.ProcessEnv = process.env): {
  seam: "preview.seam";
  level: string;
  checked: string;
  ok: boolean;
  violations: PreviewEnvViolation[];
} {
  const violations = validatePreviewEnv(env);
  const preview = isVercelPreviewDeploy(env);
  return {
    seam: "preview.seam",
    level: preview ? (violations.length === 0 ? "HARD" : "FAIL") : "N/A",
    checked: "preview env rejects write/commit authority",
    ok: violations.length === 0,
    violations,
  };
}