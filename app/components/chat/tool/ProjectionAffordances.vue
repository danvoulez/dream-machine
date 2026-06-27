<script setup lang="ts">
import type { DeclaredAffordance } from "~~/shared/tools/runtime-projection";

defineProps<{
  affordances: DeclaredAffordance[];
}>();

const emit = defineEmits<{
  select: [args: Record<string, unknown>];
}>();

function onSelect(aff: DeclaredAffordance) {
  emit("select", { op: aff.affordance_id });
}
</script>

<template>
  <div
    v-if="affordances.length"
    data-testid="projection-affordance-buttons"
    class="space-y-1"
  >
    <span class="text-[11px] text-dimmed">Available actions (read-only):</span>
    <div class="flex flex-wrap gap-1">
      <UButton
        v-for="aff in affordances"
        :key="aff.affordance_id"
        size="xs"
        color="neutral"
        variant="soft"
        :data-testid="`projection-affordance-${aff.affordance_id}`"
        @click="onSelect(aff)"
      >
        {{ aff.label }} · {{ aff.risk_tier }}
      </UButton>
    </div>
  </div>
</template>