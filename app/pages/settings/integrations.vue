<script setup lang="ts">
const { connectors, error, refresh, isInitialLoad, pending } = useConnectors();

const connectedCount = computed(
  () => connectors.value?.filter((connector) => connector.status.state === "connected").length ?? 0,
);

const totalCount = computed(() => connectors.value?.length ?? 0);
</script>

<template>
  <UDashboardPanel
    id="integrations"
    class="min-h-0"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <h1 class="text-sm font-medium text-highlighted">
            Integrations
          </h1>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="max-w-2xl space-y-8 py-6 sm:py-8">
        <header class="space-y-1">
          <h1 class="text-xl font-semibold tracking-tight text-highlighted">
            Integrations
          </h1>
          <p class="text-sm text-muted">
            Connect channels and services your agent can use.
          </p>
        </header>

        <section class="space-y-3">
          <div class="space-y-0.5">
            <h2 class="text-sm font-medium text-highlighted">
              Channels
            </h2>
            <p class="text-xs text-muted">
              Link messaging platforms to your Adam account. Powered by Vercel Connect — no extra Slack env vars.
            </p>
          </div>

          <IntegrationsSlackLinkCard />
        </section>

        <section class="space-y-3">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-0.5">
              <h2 class="text-sm font-medium text-highlighted">
                Services
              </h2>
              <p class="text-xs text-muted">
                OAuth tools available in chat and Slack once linked.
              </p>
              <p
                v-if="!isInitialLoad && !error"
                class="text-[11px] text-dimmed"
              >
                {{ connectedCount }} of {{ totalCount }} connected
              </p>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-refresh-cw"
              :loading="pending"
              aria-label="Refresh services"
              @click="refresh()"
            />
          </div>

          <div
            v-if="isInitialLoad"
            class="space-y-2"
          >
            <USkeleton
              v-for="index in 2"
              :key="index"
              class="h-14 rounded-lg"
            />
          </div>

          <UAlert
            v-else-if="error"
            color="error"
            variant="subtle"
            title="Failed to load services"
            :description="error.message"
          />

          <div
            v-else
            class="space-y-2"
          >
            <IntegrationsConnectorCard
              v-for="connector in connectors"
              :key="connector.id"
              :connector="connector"
              @refresh="refresh()"
            />
          </div>
        </section>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
