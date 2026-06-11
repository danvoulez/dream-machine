<script setup lang="ts">
import { agent } from "~~/shared/agent";

useSeoMeta({
  title: agent.name,
  description: agent.description,
});
</script>

<template>
  <AgentChat />
</template>
