<script setup lang="ts">
import type { ConnectorSummary } from "#shared/types/connector";

const props = defineProps<{
  connector: ConnectorSummary;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const {
  status,
  canConnect,
  isConnected,
  needsSetup,
  setupStatus,
  errorStatus,
  hintLines,
  connecting,
  testing,
  revoking,
  showRevokeModal,
  showTestResults,
  testResults,
  actionError,
  parsedResults,
  connect,
  test,
  revoke,
  clearResults,
} = useConnector(() => props.connector, () => emit("refresh"));

const statusDotClass = computed(() => {
  switch (status.value.color) {
    case "success":
      return "bg-emerald-400/90 shadow-[0_0_6px_1px_rgba(52,211,153,0.35)]";
    case "warning":
      return "bg-amber-400/90";
    case "error":
      return "bg-red-400/90";
    default:
      return "bg-muted/60";
  }
});
</script>

<template>
  <div
    class="group rounded-lg border border-default/70 bg-elevated/30 transition-[border-color,background-color,box-shadow] duration-150 hover:border-default hover:bg-elevated/55 hover:shadow-sm"
  >
    <div class="flex items-center gap-3 px-3 py-2.5 sm:px-3.5 sm:py-3">
      <div
        class="flex size-8 shrink-0 items-center justify-center rounded-md border border-default/60 bg-default/50"
      >
        <UIcon
          :name="connector.icon"
          class="size-4 text-toned"
        />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            {{ connector.name }}
          </h2>
          <span class="inline-flex items-center gap-1.5 text-[11px] text-dimmed">
            <span
              class="size-1.5 shrink-0 rounded-full"
              :class="statusDotClass"
            />
            {{ status.label }}
          </span>
        </div>
        <p class="truncate text-xs text-muted">
          <span
            v-if="connector.connectedAs"
            class="text-toned"
          >{{ connector.connectedAs }}</span>
          <span
            v-if="connector.connectedAs"
            class="text-dimmed"
          > · </span>
          {{ connector.description }}
        </p>
      </div>

      <div
        class="flex shrink-0 items-center gap-0.5 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        :class="{ 'opacity-100': connecting || testing || revoking }"
      >
        <UButton
          v-if="canConnect"
          color="neutral"
          variant="soft"
          size="xs"
          :loading="connecting"
          trailing-icon="i-lucide-arrow-up-right"
          @click="connect"
        >
          Connect
        </UButton>

        <template v-if="isConnected">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-play"
            :loading="testing"
            aria-label="Test connection"
            @click="test"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-unplug"
            aria-label="Disconnect"
            @click="showRevokeModal = true"
          />
        </template>
      </div>
    </div>

    <div
      v-if="needsSetup"
      class="mx-3 mb-3 space-y-1.5 rounded-md border border-warning/20 bg-warning/5 p-2.5 sm:mx-3.5"
    >
      <p class="text-xs text-toned">
        {{ setupStatus?.message }}
      </p>
      <div
        v-if="hintLines.length"
        class="space-y-1"
      >
        <code
          v-for="(line, index) in hintLines.filter(isCliHintLine)"
          :key="index"
          class="block rounded border border-default/80 bg-default/60 px-2 py-1 font-mono text-[11px] text-toned"
        >{{ line }}</code>
      </div>
    </div>

    <p
      v-else-if="errorStatus"
      class="px-3 pb-2.5 text-xs text-error sm:px-3.5"
    >
      {{ errorStatus.message }}
    </p>

    <p
      v-if="actionError"
      class="px-3 pb-2.5 text-xs text-error sm:px-3.5"
    >
      {{ actionError }}
    </p>

    <div
      v-if="showTestResults && testResults?.length"
      class="mx-3 mb-3 overflow-hidden rounded-md border border-default/70 bg-default/40 sm:mx-3.5"
    >
      <div class="flex items-center justify-between border-b border-default/60 px-2.5 py-1.5">
        <p class="text-[10px] font-medium tracking-wide text-dimmed uppercase">
          {{ parsedResults.length }} issues
        </p>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-x"
          aria-label="Clear results"
          @click="clearResults"
        />
      </div>
      <ul class="max-h-36 divide-y divide-default/50 overflow-y-auto">
        <li
          v-for="(result, index) in parsedResults.slice(0, 5)"
          :key="index"
          class="px-2.5 py-1.5 text-xs"
        >
          <span
            v-if="result.id"
            class="font-mono text-toned"
          >{{ result.id }}</span>
          <span
            v-if="result.id"
            class="text-dimmed"
          > · </span>
          <span class="text-muted">{{ result.title }}</span>
        </li>
      </ul>
    </div>

    <UModal
      v-model:open="showRevokeModal"
      :title="`Disconnect ${connector.name}?`"
      description="Adam will lose access until you connect again."
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          @click="showRevokeModal = false"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          size="sm"
          :loading="revoking"
          @click="revoke"
        >
          Disconnect
        </UButton>
      </template>
    </UModal>
  </div>
</template>
