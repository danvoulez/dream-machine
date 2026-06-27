<script setup lang="ts">
import type { SceneUIToolInvocation } from "~~/shared/utils/tools/scene";

const { data, error, pending } = await useFetch<{
  ok: boolean;
  output: SceneUIToolInvocation["output"];
  processCount: number;
  visibleCount: number;
}>("/api/acceptance/scene", { server: false });

const invocation = computed<SceneUIToolInvocation | null>(() => {
  if (!data.value?.output) return null;
  return {
    type: "dynamic-tool",
    toolName: "scene",
    toolCallId: "acceptance-scene",
    state: "output-available",
    input: { op: "scene.open", goal: "quais são os processos e seus andamentos?" },
    output: data.value.output,
  };
});
</script>

<template>
  <UDashboardPanel
    id="acceptance-scene"
    class="min-h-0"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <p class="text-sm font-medium text-highlighted">
            Scene acceptance (T-P2)
          </p>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="flex flex-1 flex-col gap-4 py-6">
        <p class="text-sm text-muted">
          Portal receipt: Scene card over the real seeded ledgers via the scene plugin path.
        </p>

        <p
          v-if="pending"
          class="text-sm text-dimmed"
        >
          Loading scene…
        </p>

        <p
          v-else-if="error"
          class="text-sm text-error"
          data-testid="scene-acceptance-error"
        >
          {{ error.statusMessage ?? error.message ?? "Scene acceptance failed" }}
        </p>

        <div
          v-else-if="invocation"
          data-testid="scene-acceptance-ready"
        >
          <p
            class="mb-3 text-xs text-dimmed"
            data-testid="scene-acceptance-summary"
          >
            {{ data?.processCount }} process candidate(s), {{ data?.visibleCount }} visible
          </p>
          <ChatToolScene :invocation="invocation" />
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>