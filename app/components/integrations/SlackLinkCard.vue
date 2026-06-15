<script setup lang="ts">
const {
  data: slackLink,
  pending,
  error,
  isLinked,
  pendingCode,
  generating,
  generateLinkCode,
  unlinkSlack,
} = useSlackLink();

const unlinking = ref(false);
const copied = ref(false);

const expiresLabel = computed(() => {
  const expiresAt = slackLink.value?.pendingExpiresAt;
  if (!expiresAt) {
    return undefined;
  }

  const minutes = Math.max(1, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000));
  return `Expires in ${minutes} min`;
});

async function onUnlink() {
  unlinking.value = true;
  try {
    await unlinkSlack();
  }
  finally {
    unlinking.value = false;
  }
}

async function copyCode() {
  const code = pendingCode.value ?? slackLink.value?.pendingCode;
  if (!code) {
    return;
  }

  await navigator.clipboard.writeText(`link ${code}`);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>

<template>
  <div class="rounded-lg border border-default/70 bg-elevated/30">
    <div class="flex items-center gap-3 px-3 py-2.5 sm:px-3.5 sm:py-3">
      <div
        class="flex size-8 shrink-0 items-center justify-center rounded-md border border-default/60 bg-default/50"
      >
        <UIcon
          name="i-simple-icons-slack"
          class="size-4 text-toned"
        />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-medium text-highlighted">
            Slack
          </h3>
          <span
            v-if="!pending"
            class="inline-flex items-center gap-1.5 text-[11px] text-dimmed"
          >
            <span
              class="size-1.5 shrink-0 rounded-full"
              :class="isLinked
                ? 'bg-emerald-400/90 shadow-[0_0_6px_1px_rgba(52,211,153,0.35)]'
                : 'bg-muted/60'"
            />
            {{ isLinked ? "Linked" : "Not linked" }}
          </span>
        </div>
        <p class="truncate text-xs text-muted">
          <template v-if="isLinked && slackLink?.displayName">
            {{ slackLink.displayName }}
            <span
              v-if="slackLink.userName"
              class="text-dimmed"
            > · @{{ slackLink.userName }}</span>
          </template>
          <template v-else>
            Uses your Adam profile and service connections in Slack.
          </template>
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <UButton
          v-if="isLinked"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-unlink"
          :loading="unlinking"
          aria-label="Unlink Slack"
          @click="onUnlink"
        />
        <UButton
          v-else
          color="neutral"
          variant="soft"
          size="xs"
          :loading="generating || pending"
          @click="generateLinkCode"
        >
          {{ pendingCode ? "New code" : "Generate code" }}
        </UButton>
      </div>
    </div>

    <div
      v-if="!isLinked && pendingCode"
      class="border-t border-default/60 px-3 py-3 sm:px-3.5"
    >
      <ol class="space-y-2 text-xs text-muted">
        <li class="flex gap-2">
          <span class="text-dimmed">1.</span>
          <span>In Slack, message <code class="text-toned">@Adam link {{ pendingCode }}</code></span>
        </li>
        <li class="flex gap-2">
          <span class="text-dimmed">2.</span>
          <span>Refresh this page once Adam confirms the link</span>
        </li>
      </ol>

      <div class="mt-3 flex items-center gap-2">
        <code class="rounded-md border border-default/70 bg-default/60 px-2.5 py-1 font-mono text-sm tracking-widest text-toned">
          {{ pendingCode }}
        </code>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          @click="copyCode"
        >
          {{ copied ? "Copied" : "Copy" }}
        </UButton>
        <span
          v-if="expiresLabel"
          class="text-[11px] text-dimmed"
        >{{ expiresLabel }}</span>
      </div>
    </div>

    <p
      v-if="error"
      class="border-t border-default/60 px-3 py-2 text-xs text-error sm:px-3.5"
    >
      {{ error.message }}
    </p>
  </div>
</template>
