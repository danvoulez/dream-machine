<script setup lang="ts">
import type { UIMessage } from "ai";
import {
  getToolName,
  isDynamicToolUIPart,
  isReasoningUIPart,
  isTextUIPart,
} from "ai";
import type { EveDynamicToolPart } from "eve/vue";
import { isPartStreaming, isToolStreaming } from "@nuxt/ui/utils/ai";
import type { AgentInputResponse } from "../AgentInputRequest.vue";

defineProps<{
  canRespond: boolean;
  message: UIMessage;
}>();

const emit = defineEmits<{
  inputResponses: [responses: AgentInputResponse[]];
}>();
</script>

<template>
  <template
    v-for="(part, index) in message.parts"
    :key="`${message.id}-${part.type}-${index}`"
  >
    <UChatReasoning
      v-if="isReasoningUIPart(part)"
      :text="part.text"
      :streaming="isPartStreaming(part)"
      chevron="leading"
    >
      <ChatComark
        :markdown="part.text"
        :streaming="isPartStreaming(part)"
      />
    </UChatReasoning>

    <UChatTool
      v-else-if="isDynamicToolUIPart(part)"
      :text="getToolName(part)"
      :streaming="isToolStreaming(part)"
      chevron="leading"
      :default-open="part.state === 'approval-requested' || part.state === 'approval-responded'"
    >
      <AgentInputRequest
        :can-respond="canRespond"
        :part="part as EveDynamicToolPart"
        @input-responses="emit('inputResponses', $event)"
      />

      <pre
        v-if="part.input"
        class="overflow-x-auto rounded-md bg-muted p-2 text-xs"
      >{{ JSON.stringify(part.input, null, 2) }}</pre>

      <pre
        v-if="part.output || part.errorText"
        class="overflow-x-auto rounded-md bg-muted p-2 text-xs"
        :class="part.errorText ? 'text-error' : ''"
      >{{ part.errorText ?? JSON.stringify(part.output, null, 2) }}</pre>
    </UChatTool>

    <template v-else-if="isTextUIPart(part)">
      <ChatComark
        v-if="message.role === 'assistant'"
        :markdown="part.text"
        :streaming="isPartStreaming(part)"
      />
      <p
        v-else
        class="whitespace-pre-wrap"
      >
        {{ part.text }}
      </p>
    </template>
  </template>
</template>
