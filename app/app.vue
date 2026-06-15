<script setup lang="ts">
import { agent } from "~~/shared/agent";

const colorMode = useColorMode();

const color = computed(() => (colorMode.value === "dark" ? "#1b1718" : "white"));

useHead({
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { key: "theme-color", name: "theme-color", content: color },
  ],
  htmlAttrs: {
    lang: "en",
  },
});

useSeoMeta({
  title: agent.name,
  description: agent.description,
});
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }" :tooltip="{ delayDuration: 200 }">
    <NuxtLoadingIndicator color="var(--ui-primary)" />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
