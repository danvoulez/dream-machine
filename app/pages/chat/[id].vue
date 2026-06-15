<script setup lang="ts">
import { useChatNavigation } from "~/composables/chat/navigation";
import { useAuthorizationChallenges } from "~/composables/chat/useAuthorizationChallenges";
import { useStreamLog } from "~/composables/chat/providers/eve/stream-log";
import { useChatSession } from "~/composables/chat/useChatSession";

const route = useRoute();
const chatId = computed(() => route.params.id as string);

const {
  messages,
  status,
  error,
  isBusy,
  sendMessage,
  sendInputResponses,
  stop,
} = useChatSession(chatId);

const { consumePendingOnMount } = useChatNavigation(chatId);
const { resetTurnEventCounts } = useStreamLog();
const { pendingChallenges, failedChallenges, tryResumeConnectedChallenges } = useAuthorizationChallenges();

const input = ref("");

watch(status, (value) => {
  if (value === "submitted") {
    resetTurnEventCounts();
  }
});

onMounted(() => {
  void tryResumeConnectedChallenges({ skipIfBusy: isBusy.value });

  if (import.meta.client) {
    const onFocus = () => {
      void tryResumeConnectedChallenges({ skipIfBusy: isBusy.value });
    };
    window.addEventListener("focus", onFocus);
    onUnmounted(() => window.removeEventListener("focus", onFocus));
  }

  if (consumePendingOnMount(sendMessage)) {
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
  void sendMessage(text);
}

function handleInputResponses(responses: Parameters<typeof sendInputResponses>[0]) {
  void sendInputResponses(responses);
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
              <ChatActivityIndicator />
            </template>

            <template #content="{ message }">
              <ChatMessageContentEve
                :message="message"
                :status="status"
                :is-last="message.id === messages.at(-1)?.id"
                :can-respond="!isBusy"
                @input-responses="handleInputResponses"
              />
            </template>
          </UChatMessages>

          <div
            v-if="pendingChallenges.length || failedChallenges.length"
            class="space-y-2"
          >
            <AgentAuthorizationRequest
              v-for="challenge in pendingChallenges"
              :key="`pending-${challenge.name}`"
              :challenge="challenge"
            />
            <AgentAuthorizationRequest
              v-for="challenge in failedChallenges"
              :key="`failed-${challenge.name}`"
              :challenge="challenge"
            />
          </div>

          <UChatPrompt
            v-model="input"
            :error="error"
            variant="subtle"
            class="sticky bottom-0 z-10 [view-transition-name:chat-prompt] rounded-b-none"
            :ui="{ base: 'px-1.5' }"
            @submit="handleSubmit"
          >
            <template #footer>
              <ChatStreamInspector :status="status" />

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
