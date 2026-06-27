<script setup lang="ts">
import type { ProjectionResponse } from "~~/shared/tools/runtime-projection";
import type {
  RuntimeProjectionOutput,
  RuntimeProjectionUIToolInvocation,
} from "~~/shared/utils/tools/runtime-projection";

const props = defineProps<{
  invocation: RuntimeProjectionUIToolInvocation;
  streaming?: boolean;
}>();

const state = computed(() => props.invocation.state as string);

const isLoading = computed(
  () => state.value !== "output-available" && state.value !== "output-error",
);

const output = computed<RuntimeProjectionOutput | undefined>(
  () => props.invocation.output as RuntimeProjectionOutput | undefined,
);

const failed = computed(
  () => state.value === "output-error" || output.value?.ok === false,
);

const projection = computed<ProjectionResponse | undefined>(() =>
  output.value?.ok ? output.value.projection : undefined,
);

const errorText = computed(() => {
  if (props.invocation.errorText) return props.invocation.errorText;
  const errs = output.value?.errors;
  if (errs?.length) return errs.map(e => `${e.field}: ${e.message}`).join("; ");
  return output.value?.reason ?? "Projection unavailable";
});

const JURISDICTION_DOT: Record<string, string> = {
  logline: "bg-emerald-400/90",
  envelope: "bg-sky-400/90",
  membrane: "bg-violet-400/90",
  mixed: "bg-amber-400/90",
};

function ownerLabel(owner: string) {
  return owner;
}
</script>

<template>
  <div class="my-1 w-full max-w-xl overflow-hidden rounded-lg border border-default/70 bg-elevated/30">
    <!-- header -->
    <div class="flex items-start gap-2.5 px-3 py-2.5">
      <div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-default/60 bg-default/50">
        <UIcon
          name="i-lucide-eye"
          class="size-3.5 text-toned"
        />
      </div>

      <div class="min-w-0 flex-1 space-y-1.5">
        <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <p class="text-xs font-medium text-highlighted">
            Runtime projection
          </p>
          <span
            v-if="projection"
            class="inline-flex items-center gap-1 text-[11px] text-dimmed"
          >
            <span
              class="size-1.5 shrink-0 rounded-full"
              :class="JURISDICTION_DOT[projection.jurisdiction] ?? 'bg-neutral-400/90'"
            />
            {{ projection.intent }} · {{ projection.jurisdiction }}
          </span>
          <UBadge
            v-if="projection"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            observation-only
          </UBadge>
          <UBadge
            v-if="projection?.freshness?.stale"
            color="warning"
            variant="subtle"
            size="xs"
          >
            stale
          </UBadge>
        </div>

        <!-- loading -->
        <p
          v-if="isLoading"
          class="flex items-center gap-1.5 text-xs text-muted"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-3.5 animate-spin"
          />
          Requesting projection…
        </p>

        <!-- error -->
        <p
          v-else-if="failed"
          class="text-[11px] text-error"
        >
          {{ errorText }}
        </p>
      </div>
    </div>

    <!-- body -->
    <div
      v-if="projection && !failed"
      class="space-y-2 border-t border-default/50 bg-default/20 px-3 py-2"
    >
      <!-- warnings -->
      <div
        v-if="projection.warnings.length"
        class="space-y-1"
      >
        <p
          v-for="(w, i) in projection.warnings"
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

      <!-- blocks -->
      <ChatToolProjectionBlockCard
        v-for="block in projection.blocks"
        :key="block.block_id"
        :block="block"
      />

      <!-- open findings -->
      <div
        v-if="projection.open_findings?.length"
        class="flex flex-wrap items-center gap-1"
      >
        <span class="text-[11px] text-dimmed">Open findings:</span>
        <UBadge
          v-for="f in projection.open_findings"
          :key="f"
          color="warning"
          variant="subtle"
          size="xs"
        >
          {{ f }}
        </UBadge>
      </div>

      <!-- structured projection diff -->
      <div
        v-if="projection.projection_diff"
        class="grid grid-cols-3 gap-1.5 rounded-md border border-default/40 bg-default/30 px-2.5 py-2"
      >
        <div>
          <p class="text-[10px] uppercase text-dimmed">
            Sources
          </p>
          <p class="text-[11px] text-toned">
            +{{ projection.projection_diff.source_refs.added.length }}
            / -{{ projection.projection_diff.source_refs.removed.length }}
          </p>
        </div>
        <div>
          <p class="text-[10px] uppercase text-dimmed">
            Findings
          </p>
          <p class="text-[11px] text-toned">
            +{{ projection.projection_diff.open_findings.added.length }}
            / -{{ projection.projection_diff.open_findings.removed.length }}
          </p>
        </div>
        <div>
          <p class="text-[10px] uppercase text-dimmed">
            Blocks
          </p>
          <p class="text-[11px] text-toned">
            +{{ projection.projection_diff.narrative_blocks.added.length }}
            / -{{ projection.projection_diff.narrative_blocks.removed.length }}
            / {{ projection.projection_diff.narrative_blocks.changed.length }} changed
          </p>
        </div>
      </div>

      <!-- source refs -->
      <div
        v-if="projection.source_refs.length"
        class="flex flex-wrap items-center gap-1"
      >
        <span class="text-[11px] text-dimmed">Sources:</span>
        <UBadge
          v-for="(ref, i) in projection.source_refs"
          :key="`src-${i}`"
          color="neutral"
          variant="outline"
          size="xs"
        >
          {{ ownerLabel(ref.owner) }} · {{ ref.ref_kind }}:{{ ref.ref }}
        </UBadge>
      </div>

      <ChatToolProjectionAffordances :affordances="projection.affordances" />
    </div>

    <!-- cannot_do footer -->
    <div
      v-if="projection && !failed && projection.cannot_do.length"
      class="border-t border-default/50 px-3 py-1.5"
    >
      <p class="text-[10px] leading-snug text-dimmed">
        Cannot: {{ projection.cannot_do.join(" · ") }}
      </p>
    </div>
  </div>
</template>
