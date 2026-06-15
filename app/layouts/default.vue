<script setup lang="ts">
import { agent } from "~~/shared/agent";

useAdamChat();

const sidebarOpen = ref(false);
const searchOpen = ref(false);

const searchGroups = computed(() => [
  {
    id: "actions",
    label: "Actions",
    items: [
      {
        label: "New chat",
        to: "/",
        icon: "i-lucide-circle-plus",
        kbds: ["meta", "o"],
        onSelect: () => startNewChat(),
      },
    ],
  },
]);

defineShortcuts({
  meta_o: () => startNewChat(),
  meta_k: () => {
    searchOpen.value = true;
  },
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="sidebarOpen"
      :min-size="12"
      collapsible
      resizable
      :menu="{ inset: true }"
      class="border-r-0 py-4 dark:[--ui-bg-elevated:var(--ui-color-neutral-900)]"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          v-if="!collapsed"
          to="/"
          class="flex items-center gap-2"
        >
          <Logo class="size-8 shrink-0" />
          <span class="text-xl font-bold text-highlighted">{{ agent.name }}</span>
        </NuxtLink>

        <UDashboardSidebarCollapse class="ms-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="[
            {
              label: 'New chat',
              icon: 'i-lucide-circle-plus',
              kbds: ['meta', 'o'],
              onSelect: () => startNewChat(),
            },
            {
              label: 'Search',
              icon: 'i-lucide-search',
              kbds: ['meta', 'k'],
              onSelect: () => {
                searchOpen = true;
              },
            },
          ]"
          :collapsed="collapsed"
          orientation="vertical"
        >
          <template #item-trailing="{ item }">
            <div
              v-if="item.kbds?.length"
              class="flex items-center gap-px opacity-0 transition-opacity group-hover:opacity-100"
            >
              <UKbd
                v-for="kbd in item.kbds"
                :key="kbd"
                :value="kbd"
                size="sm"
                variant="soft"
                class="bg-accented/50"
              />
            </div>
          </template>
        </UNavigationMenu>

        <div
          v-if="!collapsed"
          class="mt-4 px-3"
        >
          <p class="mb-2 text-xs font-medium text-muted">
            Recent
          </p>
          <p class="text-sm text-dimmed">
            No conversations yet. Chat history is coming soon.
          </p>
        </div>
      </template>

      <template #footer />
    </UDashboardSidebar>

    <UDashboardSearch
      v-model:open="searchOpen"
      placeholder="Search actions..."
      :groups="searchGroups"
    />

    <div class="m-4 flex flex-1 min-w-0 overflow-hidden rounded-lg bg-default/75 shadow ring ring-default lg:ml-0">
      <slot />
    </div>
  </UDashboardGroup>
</template>
