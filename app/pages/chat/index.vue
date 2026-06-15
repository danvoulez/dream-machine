<script setup lang="ts">
import type { UIMessage } from "ai";
import type { AgentInputResponse } from "~/components/AgentInputRequest.vue";

const { data, error, send, status, stop } = useAdamChat();

const messages = computed(() => [...data.value.messages] as UIMessage[]);
const isBusy = computed(
  () => status.value === "submitted" || status.value === "streaming",
);

const input = ref("");

onMounted(() => {
  const pending = consumePendingMessage();
  if (pending) {
    void send({ message: pending });
    return;
  }

  if (messages.value.length === 0) {
    void navigateTo("/");
  }
});

function handleSubmit(e: Event) {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || isBusy.value) return;
  input.value = "";
  void send({ message: text });
}

function handleInputResponses(inputResponses: AgentInputResponse[]) {
  void send({ inputResponses });
}
</script>

<template>
  <UDashboardPanel
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <p class="truncate text-sm font-medium text-highlighted">
            Chat
          </p>
        </template>
      </Navbar>
    </template>

    <template #body>
      <div class="flex flex-1">
        <UContainer class="flex flex-1 flex-col gap-4 sm:gap-6">
          <UChatMessages
            should-auto-scroll
            :messages="messages"
            :status="status"
            :spacing-offset="160"
            :assistant="{ side: 'left', variant: 'naked', ui: { container: 'relative flex w-full min-w-0 items-start' } }"
            class="pt-(--ui-header-height) pb-4 sm:pb-6"
          >
            <template #indicator>
              <div class="flex items-center gap-1.5">
                <ChatIndicator />

                <UChatShimmer
                  text="Thinking..."
                  class="text-sm"
                />
              </div>
            </template>

            <template #content="{ message }">
              <ChatMessageContent
                :message="message"
                :can-respond="!isBusy"
                @input-responses="handleInputResponses"
              />
            </template>
          </UChatMessages>

          <UChatPrompt
            v-model="input"
            :error="error"
            variant="subtle"
            class="sticky bottom-0 z-10 [view-transition-name:chat-prompt] rounded-b-none"
            :ui="{ base: 'px-1.5' }"
            @submit="handleSubmit"
          >
            <template #footer>
              <div />

              <UChatPromptSubmit
                :status="status"
                color="neutral"
                size="sm"
                @stop="stop()"
              />
            </template>
          </UChatPrompt>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>
