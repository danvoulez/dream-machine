<script setup lang="ts">
import type { ProjectionBlock, ProjectionBlockKind } from "~~/shared/tools/runtime-projection";

const props = defineProps<{
  block: ProjectionBlock;
}>();

const BLOCK_META: Record<
  ProjectionBlockKind,
  { icon: string; accent: string; testId: string }
> = {
  summary: { icon: "i-lucide-align-left", accent: "border-default/40", testId: "summary" },
  source_ref: { icon: "i-lucide-link", accent: "border-sky-500/35 bg-sky-500/5", testId: "source-ref" },
  proposal: { icon: "i-lucide-file-signature", accent: "border-amber-500/35 bg-amber-500/5", testId: "proposal-detail" },
  board_act: { icon: "i-lucide-clipboard-list", accent: "border-violet-500/35 bg-violet-500/5", testId: "board-act" },
  logline_receipt: { icon: "i-lucide-receipt", accent: "border-emerald-500/35 bg-emerald-500/5", testId: "receipt-detail" },
  finding: { icon: "i-lucide-search", accent: "border-orange-500/35 bg-orange-500/5", testId: "finding" },
  attention: { icon: "i-lucide-bell-ring", accent: "border-amber-500/45 bg-amber-500/8", testId: "attention" },
  risk_note: { icon: "i-lucide-shield-alert", accent: "border-red-500/35 bg-red-500/5", testId: "risk-note" },
  warning: { icon: "i-lucide-triangle-alert", accent: "border-amber-500/35 bg-amber-500/5", testId: "warning" },
  next_step: { icon: "i-lucide-arrow-right", accent: "border-cyan-500/35 bg-cyan-500/5", testId: "next-steps" },
  divider: { icon: "i-lucide-minus", accent: "border-default/20", testId: "divider" },
};

const meta = computed(() => BLOCK_META[props.block.kind] ?? BLOCK_META.summary);
const isDivider = computed(() => props.block.kind === "divider");
</script>

<template>
  <div
    v-if="isDivider"
    :data-testid="`projection-block-${meta.testId}`"
    class="border-t border-default/30"
    role="separator"
  />

  <div
    v-else
    :data-testid="`projection-block-${meta.testId}`"
    class="rounded-md border px-2.5 py-2"
    :class="meta.accent"
  >
    <div class="flex items-start gap-2">
      <UIcon
        :name="meta.icon"
        class="mt-0.5 size-3.5 shrink-0 text-toned"
      />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
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
          <UBadge
            v-if="block.risk_tier"
            color="neutral"
            variant="outline"
            size="xs"
          >
            {{ block.risk_tier }}
          </UBadge>
        </div>
        <p
          v-if="block.body"
          class="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted"
        >
          {{ block.body }}
        </p>
        <div
          v-if="block.source_refs.length"
          class="mt-1.5 flex flex-wrap gap-1"
        >
          <UBadge
            v-for="ref in block.source_refs"
            :key="`${block.block_id}-${ref}`"
            color="neutral"
            variant="outline"
            size="xs"
          >
            {{ ref }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</template>