<script setup lang="ts">
import type { EveDynamicToolPart } from "eve/vue";

export type AgentInputResponse = {
  optionId?: string;
  requestId: string;
  text?: string;
};

const props = defineProps<{
  canRespond: boolean;
  part: EveDynamicToolPart;
}>();

const emit = defineEmits<{
  inputResponses: [responses: AgentInputResponse[]];
}>();

const inputRequest = computed(() => props.part.toolMetadata?.eve?.inputRequest);
const inputResponse = computed(() => props.part.toolMetadata?.eve?.inputResponse);

const selectedOption = computed(() => {
  const request = inputRequest.value;
  const response = inputResponse.value;
  if (!request?.options || !response?.optionId) return undefined;
  return request.options.find((option) => option.id === response.optionId);
});

function respond(optionId: string, requestId: string) {
  emit("inputResponses", [{ optionId, requestId }]);
}
</script>

<template>
  <div
    v-if="inputRequest"
    class="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-3"
  >
    <p class="text-sm text-muted">
      {{ inputRequest.prompt }}
    </p>

    <p
      v-if="inputResponse"
      class="text-sm font-medium"
    >
      Responded:
      {{ selectedOption?.label ?? inputResponse.text ?? inputResponse.optionId }}
    </p>

    <div
      v-else
      class="flex flex-wrap gap-2"
    >
      <UButton
        v-for="option in inputRequest.options"
        :key="option.id"
        :color="option.style === 'danger' ? 'error' : 'primary'"
        :disabled="!canRespond"
        size="sm"
        @click="respond(option.id, inputRequest.requestId)"
      >
        {{ option.label }}
      </UButton>
    </div>
  </div>
</template>
