<script setup lang="ts">
import type { UIMessage } from "ai";
import { agent } from "~~/shared/agent";
import type { AgentInputResponse } from "./AgentInputRequest.vue";

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
      <UDashboardNavbar
        class="pointer-events-none absolute inset-x-0 top-0 z-10 border-b-0 backdrop-blur sm:px-4 lg:backdrop-blur-none"
        :ui="{ left: 'pointer-events-auto min-w-0', right: 'pointer-events-auto' }"
      >
        <template #left>
          <div class="flex min-w-0 items-center gap-2">
            <UAvatar
              :icon="agent.avatar.icon"
              size="2xs"
              class="shrink-0"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-highlighted">
                {{ agent.name }}
              </p>
              <p
                v-if="isEmpty"
                class="truncate text-xs text-muted"
              >
                {{ agent.tagline }}
              </p>
            </div>
          </div>
        </template>

        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex min-h-0 flex-1">
        <UContainer
          class="flex min-h-0 flex-1 flex-col"
          :class="isEmpty ? 'justify-center gap-6 py-8 sm:gap-8' : 'gap-4 sm:gap-6'"
        >
          <div
            v-if="isEmpty"
            class="flex flex-col items-center gap-3 text-center"
          >
            <UAvatar
              :icon="agent.avatar.icon"
              size="xl"
              class="mb-1"
            />
            <h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
              {{ agent.name }}
            </h1>
            <p class="max-w-md text-base text-muted sm:text-lg">
              {{ agent.tagline }}
            </p>
            <p class="max-w-lg text-sm text-dimmed">
              {{ agent.description }}
            </p>
          </div>

          <UChatMessages
            v-if="!isEmpty"
            :messages="messages"
            :status="status"
            should-auto-scroll
            :spacing-offset="160"
            :assistant="{ avatar: agent.avatar, side: 'left', variant: 'naked' }"
            class="min-h-0 flex-1 pt-(--ui-header-height) pb-4 sm:pb-6"
          >
            <template #indicator>
              <div class="flex items-center gap-1.5">
                <ChatIndicator />
                <UChatShimmer
                  :text="`${agent.name} is thinking…`"
                  class="text-sm"
                />
              </div>
            </template>

            <template #content="{ message }">
              <ChatMessageContent
                :can-respond="!isBusy"
                :message="message"
                @input-responses="handleInputResponses"
              />
            </template>
          </UChatMessages>

          <UChatPrompt
            v-model="input"
            :error="error"
            :placeholder="`Message ${agent.name}…`"
            variant="subtle"
            class="[view-transition-name:chat-prompt]"
            :class="!isEmpty ? 'sticky bottom-0 z-10 rounded-b-none' : ''"
            :ui="{ base: 'px-1.5' }"
            @submit="onSubmit"
          >
            <template #footer>
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
