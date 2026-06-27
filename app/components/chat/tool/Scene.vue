<script setup lang="ts">
import type { SceneResponse } from "~~/shared/tools/scene";
import type { ProjectionResponse } from "~~/shared/tools/runtime-projection";
import type { SceneOutput, SceneUIToolInvocation } from "~~/shared/utils/tools/scene";

const props = defineProps<{
  invocation: SceneUIToolInvocation;
  streaming?: boolean;
}>();

const emit = defineEmits<{
  sceneMove: [args: Record<string, unknown>];
}>();

const state = computed(() => props.invocation.state as string);

const isLoading = computed(
  () => state.value !== "output-available" && state.value !== "output-error",
);

const output = computed<SceneOutput | undefined>(
  () => props.invocation.output as SceneOutput | undefined,
);

const failed = computed(
  () => state.value === "output-error" || output.value?.ok === false,
);

const scene = computed<SceneResponse | undefined>(() =>
  output.value?.ok ? output.value.scene : undefined,
);

const projection = computed<ProjectionResponse | undefined>(() =>
  output.value?.ok ? output.value.projection : undefined,
);

const cannotDo = computed(() => {
  const fromOutput = output.value?.cannot_do ?? [];
  const fromProjection = projection.value?.cannot_do ?? [];
  return [...new Set([...fromOutput, ...fromProjection])];
});

const errorText = computed(() => {
  if (props.invocation.errorText) return props.invocation.errorText;
  const errs = output.value?.errors;
  if (errs?.length) return errs.map(e => `${e.field}: ${e.message}`).join("; ");
  return output.value?.reason ?? "Scene unavailable";
});

const WAITING_LABEL: Record<string, string> = {
  human: "human",
  process: "process",
  none: "—",
};

function onMove(args: Record<string, unknown>) {
  emit("sceneMove", args);
}
</script>

<template>
  <div
    data-testid="scene-card"
    class="my-1 w-full max-w-xl overflow-hidden rounded-lg border border-default/70 bg-elevated/30"
  >
    <div class="flex items-start gap-2.5 px-3 py-2.5">
      <div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-default/60 bg-default/50">
        <UIcon
          name="i-lucide-layout-grid"
          class="size-3.5 text-toned"
        />
      </div>

      <div class="min-w-0 flex-1 space-y-1.5">
        <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <p class="text-xs font-medium text-highlighted">
            Scene
          </p>
          <UBadge
            v-if="scene"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            observation-only
          </UBadge>
          <UBadge
            v-if="scene?.freshness?.stale"
            color="warning"
            variant="subtle"
            size="xs"
          >
            stale
          </UBadge>
        </div>

        <p
          v-if="isLoading"
          class="flex items-center gap-1.5 text-xs text-muted"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-3.5 animate-spin"
          />
          Assembling scene…
        </p>

        <p
          v-else-if="failed"
          class="text-[11px] text-error"
        >
          {{ errorText }}
        </p>
      </div>
    </div>

    <div
      v-if="scene && !failed"
      class="space-y-2 border-t border-default/50 bg-default/20 px-3 py-2"
    >
      <p class="text-[11px] font-medium text-toned">
        Vendo {{ scene.loss_accounting.visible_count }} de {{ scene.loss_accounting.total_candidates }}
        — ordenado por {{ scene.view.order }}
      </p>

      <div
        v-if="scene.warnings.length"
        class="space-y-1"
      >
        <p
          v-for="(w, i) in scene.warnings"
          :key="`w-${i}`"
          class="flex items-start gap-1.5 text-[11px] leading-snug text-amber-600 dark:text-amber-400"
        >
          <UIcon
            name="i-lucide-triangle-alert"
            class="mt-0.5 size-3 shrink-0"
          />
          <span><span class="font-medium">{{ w.kind }}:</span> {{ w.message }}</span>
        </p>
      </div>

      <div
        v-for="item in scene.view.items"
        :key="item.id"
        data-testid="scene-process-item"
        class="rounded-md border border-default/40 bg-elevated/30 px-2.5 py-2"
      >
        <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <p class="text-[11px] font-medium text-toned">
            {{ item.title }}
          </p>
          <UBadge
            color="neutral"
            variant="soft"
            size="xs"
          >
            {{ item.state || item.flow.current }}
          </UBadge>
          <UBadge
            v-if="item.stuck"
            color="warning"
            variant="subtle"
            size="xs"
          >
            stuck
          </UBadge>
          <UBadge
            color="neutral"
            variant="outline"
            size="xs"
          >
            {{ item.risk }}
          </UBadge>
        </div>
        <p class="mt-1 text-[11px] text-dimmed">
          waiting: {{ WAITING_LABEL[item.waiting_on] ?? item.waiting_on }}
          · {{ item.process_id }}
        </p>
        <p
          v-if="item.open_findings.length"
          class="mt-1 text-[11px] text-muted"
        >
          findings: {{ item.open_findings.map(f => f.kind).join(", ") }}
        </p>
      </div>

      <div
        v-if="scene.legal_next_moves.length"
        class="flex flex-wrap gap-1"
      >
        <UButton
          v-for="move in scene.legal_next_moves"
          :key="move.move"
          size="xs"
          color="neutral"
          variant="soft"
          @click="onMove({ op: move.move, ...move.args })"
        >
          {{ move.label }}
        </UButton>
      </div>

      <div
        v-if="scene.proposals.length"
        class="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2"
      >
        <p class="text-[10px] uppercase text-dimmed">
          Requer airlock
        </p>
        <div
          v-for="p in scene.proposals"
          :key="p.intent"
          class="text-[11px] text-muted"
        >
          {{ p.label }} · {{ p.airlock }}
        </div>
      </div>

      <div
        v-if="projection"
        data-testid="scene-projection-blocks"
        class="space-y-2 border-t border-default/40 pt-2"
      >
        <p class="text-[10px] uppercase text-dimmed">
          Projection ({{ projection.intent }} · {{ projection.jurisdiction }})
        </p>

        <div
          v-for="block in projection.blocks"
          :key="block.block_id"
          data-testid="scene-projection-block"
          class="rounded-md border border-default/40 bg-elevated/30 px-2.5 py-2"
        >
          <div class="flex flex-wrap items-center gap-x-1.5">
            <p class="text-[11px] font-medium text-toned">
              {{ block.title || block.kind }}
            </p>
            <UBadge
              color="neutral"
              variant="soft"
              size="xs"
            >
              {{ block.kind }}
            </UBadge>
          </div>
          <p
            v-if="block.body"
            class="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted"
          >
            {{ block.body }}
          </p>
        </div>

        <div
          v-if="projection.affordances.length"
          data-testid="scene-projection-affordances"
          class="flex flex-wrap gap-1"
        >
          <UBadge
            v-for="aff in projection.affordances"
            :key="aff.affordance_id"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ aff.label }}
          </UBadge>
        </div>
      </div>
    </div>

    <div
      v-if="scene && !failed && cannotDo.length"
      data-testid="scene-cannot-do"
      class="border-t border-default/50 px-3 py-1.5"
    >
      <p class="text-[10px] leading-snug text-dimmed">
        Cannot: {{ cannotDo.join(" · ") }}
      </p>
    </div>
  </div>
</template>