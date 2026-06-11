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

const AGENT_NAME = "adam";

const { data, error, send, status, stop } = useEveAgent();

const input = ref("");
const messages = computed(() => [...data.value.messages] as UIMessage[]);
const isEmpty = computed(() => messages.value.length === 0);
const isBusy = computed(
  () => status.value === "submitted" || status.value === "streaming",
);

function onSubmit() {
  const text = input.value.trim();
  if (!text || isBusy.value) return;
  input.value = "";
  void send({ message: text });
}

function handleInputResponses(
  inputResponses: Array<{ optionId?: string; requestId: string; text?: string }>,
) {
  void send({ inputResponses });
}
</script>

<template>
  <main class="flex h-dvh flex-col overflow-hidden">
    <UChatMessages
      v-if="!isEmpty"
      :messages="messages"
      :status="status"
      should-auto-scroll
      class="min-h-0 flex-1"
      :spacing-offset="96"
      :assistant="{ avatar: { icon: 'i-lucide-bot' } }"
    >
      <template #content="{ message }">
        <template
          v-for="(part, index) in message.parts"
          :key="`${message.id}-${part.type}-${index}`"
        >
          <UChatReasoning
            v-if="isReasoningUIPart(part)"
            :text="part.text"
            :streaming="isPartStreaming(part)"
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
            :default-open="part.state === 'approval-requested' || part.state === 'approval-responded'"
          >
            <AgentInputRequest
              :can-respond="!isBusy"
              :part="part as EveDynamicToolPart"
              @input-responses="handleInputResponses"
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
    </UChatMessages>

    <div
      class="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6"
      :class="isEmpty ? 'items-center justify-center gap-8 pb-[10vh]' : 'shrink-0 justify-end pb-6'"
    >
      <h1
        v-if="isEmpty"
        class="text-5xl font-medium tracking-tighter"
      >
        {{ AGENT_NAME }}
      </h1>

      <UChatPrompt
        v-model="input"
        :error="error"
        placeholder="Send a message…"
        variant="subtle"
        class="w-full"
        @submit="onSubmit"
      >
        <UChatPromptSubmit
          :status="status"
          @stop="stop()"
        />
      </UChatPrompt>
    </div>
  </main>
</template>
