<script setup lang="ts">
import { agent } from "~~/shared/agent";

const colorMode = useColorMode();

const color = computed(() => (colorMode.value === "dark" ? "#1b1718" : "white"));

useHead({
  title: agent.name,
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
  description: agent.description,
});
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
