<script setup lang="ts">
import { authClient } from "~/lib/auth-client";

definePageMeta({
  layout: false,
});

const route = useRoute();
const mode = ref<"sign-in" | "sign-up">("sign-in");
const email = ref("");
const password = ref("");
const name = ref("");
const error = ref("");
const loading = ref(false);

const redirectTo = computed(() => {
  const value = route.query.redirect;
  return typeof value === "string" && value.startsWith("/") ? value : "/";
});

async function handleSubmit() {
  error.value = "";
  loading.value = true;

  try {
    if (mode.value === "sign-up") {
      const result = await authClient.signUp.email({
        email: email.value,
        password: password.value,
        name: name.value || email.value.split("@")[0] || "User",
      });

      if (result.error) {
        error.value = result.error.message ?? "Sign up failed.";
        return;
      }
    }
    else {
      const result = await authClient.signIn.email({
        email: email.value,
        password: password.value,
      });

      if (result.error) {
        error.value = result.error.message ?? "Sign in failed.";
        return;
      }
    }

    await navigateTo(redirectTo.value);
  }
  finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-svh items-center justify-center bg-default p-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="space-y-1">
          <h1 class="text-xl font-semibold text-highlighted">
            {{ mode === "sign-in" ? "Sign in" : "Create account" }}
          </h1>
          <p class="text-sm text-muted">
            Access your personal agent.
          </p>
        </div>
      </template>

      <form
        class="space-y-4"
        @submit.prevent="handleSubmit"
      >
        <UFormField
          v-if="mode === 'sign-up'"
          label="Name"
        >
          <UInput
            v-model="name"
            class="w-full"
            autocomplete="name"
            placeholder="Your name"
          />
        </UFormField>

        <UFormField label="Email">
          <UInput
            v-model="email"
            class="w-full"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
          />
        </UFormField>

        <UFormField label="Password">
          <UInput
            v-model="password"
            class="w-full"
            type="password"
            autocomplete="current-password"
            required
            minlength="8"
            placeholder="••••••••"
          />
        </UFormField>

        <p
          v-if="error"
          class="text-sm text-error"
        >
          {{ error }}
        </p>

        <UButton
          type="submit"
          block
          :loading="loading"
        >
          {{ mode === "sign-in" ? "Sign in" : "Create account" }}
        </UButton>
      </form>

      <template #footer>
        <p class="text-center text-sm text-muted">
          <button
            type="button"
            class="text-primary hover:underline"
            @click="mode = mode === 'sign-in' ? 'sign-up' : 'sign-in'"
          >
            {{
              mode === "sign-in"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"
            }}
          </button>
        </p>
      </template>
    </UCard>
  </div>
</template>
