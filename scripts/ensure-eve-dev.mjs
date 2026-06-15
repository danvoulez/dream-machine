import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";

const registryPath = join(process.cwd(), ".eve/nuxt-dev-server.json");
const lockPath = join(process.cwd(), ".eve/nuxt-dev-server.lock");

async function removeStaleRegistry() {
  await rm(registryPath, { force: true });
  await rm(lockPath, { force: true });
}

try {
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  const origin = typeof registry.origin === "string" ? registry.origin : null;

  if (!origin) {
    await removeStaleRegistry();
    process.exit(0);
  }

  const response = await fetch(`${origin}/eve/v1/health`, {
    signal: AbortSignal.timeout(1500),
  });

  if (!response.ok) {
    await removeStaleRegistry();
  }
} catch {
  await removeStaleRegistry();
}
