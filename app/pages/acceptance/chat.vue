<script setup lang="ts">
import { useChatSession } from "~/composables/chat/useChatSession";
import { useStreamLog } from "~/composables/chat/providers/eve/stream-log";

const CHAT_ID = "acceptance-t-p2";
const PROMPT = "Quais são os processos e seus andamentos? O que está em andamento no lab?";

const {
  messages,
  status,
  error: chatError,
  isBusy,
  sendMessage,
  sendInputResponses,
  stop,
  retry,
} = useChatSession(CHAT_ID);

const { resetTurnEventCounts } = useStreamLog();
const input = ref("");
const promptSent = ref(false);

watch(status, (value) => {
  if (value === "submitted") {
    resetTurnEventCounts();
  }
});

onMounted(() => {
  if (promptSent.value) return;
  promptSent.value = true;
  void sendMessage(PROMPT);
});

function handleSubmit(e: Event) {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || isBusy.value) return;
  input.value = "";
  void sendMessage(text);
}

function handleSceneMove(args: Record<string, unknown>) {
  if (isBusy.value) return;
  void sendMessage(`Use the scene tool with: ${JSON.stringify(args)}`);
}
</script>

<template>
  <UDashboardPanel
    id="acceptance-chat"
    class="relative min-h-0"
    data-testid="chat-acceptance-panel"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <p class="text-sm font-medium text-highlighted">
            Chat acceptance (T-P2)
          </p>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="flex flex-1 flex-col gap-4 sm:gap-6">
        <p
          class="pt-(--ui-header-height) text-xs text-dimmed"
          data-testid="chat-acceptance-status"
        >
          Portal receipt: Eve chat → scene tool → Scene card in thread.
          <span v-if="promptSent && isBusy"> Waiting for agent…</span>
        </p>

        <p
          v-if="chatError"
          class="text-sm text-error"
          data-testid="chat-acceptance-error"
        >
          {{ chatError.message ?? "Chat failed" }}
        </p>

        <UChatMessages
          should-auto-scroll
          :messages="messages"
          :status="status"
          :spacing-offset="160"
          :assistant="{ side: 'left', variant: 'naked', ui: { container: 'relative flex w-full min-w-0 items-start' } }"
          class="pb-4 sm:pb-6"
          data-testid="chat-acceptance-messages"
        >
          <template #indicator>
            <ChatActivityIndicator />
          </template>

          <template #content="{ message }">
            <ChatMessageContentEve
              :message="message"
              :status="status"
              :is-last="message.id === messages.at(-1)?.id"
              :can-respond="!isBusy"
              @input-responses="sendInputResponses"
              @scene-move="handleSceneMove"
            />
          </template>
        </UChatMessages>

        <UChatPrompt
          v-model="input"
          :error="chatError"
          variant="subtle"
          class="sticky bottom-0 z-10 rounded-b-none"
          :ui="{ base: 'px-1.5' }"
          data-testid="chat-acceptance-prompt"
          @submit="handleSubmit"
        >
          <template #footer>
            <ChatStreamInspector :status="status" />
            <UChatPromptSubmit
              class="ms-auto shrink-0"
              :status="status"
              color="neutral"
              size="sm"
              @stop="stop()"
              @reload="retry()"
            />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>