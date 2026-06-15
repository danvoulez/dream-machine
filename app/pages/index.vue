<script setup lang="ts">
import { agent } from "~~/shared/agent";

const input = ref("");

const greeting = computed(() => {
  const hour = new Date().getHours();
  let timeGreeting = "Good evening";
  if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 18) timeGreeting = "Good afternoon";

  return timeGreeting;
});

function createChat(prompt: string) {
  const text = prompt.trim();
  if (!text) return;
  input.value = "";
  void startChat(text);
}

function onSubmit() {
  createChat(input.value);
}

const quickChats = [
  {
    label: "Who are you?",
    icon: "i-lucide-user-round",
  },
  {
    label: "What can you help me with?",
    icon: "i-lucide-message-circle-question",
  },
  {
    label: "What is the weather in Paris?",
    icon: "i-lucide-sun",
  },
  {
    label: "Summarize my day",
    icon: "i-lucide-calendar-days",
  },
];
</script>

<template>
  <UDashboardPanel
    id="home"
    class="min-h-0"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar />
    </template>

    <template #body>
      <div class="flex flex-1">
        <UContainer class="flex flex-1 flex-col justify-center gap-4 py-8 sm:gap-6">
          <div class="space-y-1">
            <h1 class="text-3xl font-bold text-highlighted sm:text-4xl">
              {{ greeting }}
            </h1>
            <p class="text-sm text-muted sm:text-base">
              {{ agent.tagline }}
            </p>
          </div>

          <UChatPrompt
            v-model="input"
            class="[view-transition-name:chat-prompt]"
            variant="subtle"
            :ui="{ base: 'px-1.5' }"
            @submit="onSubmit"
          >
            <template #footer>
              <div />

              <UChatPromptSubmit
                color="neutral"
                size="sm"
              />
            </template>
          </UChatPrompt>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="quickChat in quickChats"
              :key="quickChat.label"
              :icon="quickChat.icon"
              :label="quickChat.label"
              size="sm"
              color="neutral"
              variant="outline"
              class="rounded-full"
              @click="createChat(quickChat.label)"
            />
          </div>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>
