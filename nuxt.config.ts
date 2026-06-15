export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@comark/nuxt", "eve/nuxt"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  experimental: {
    viewTransition: true,
  },
  compatibilityDate: "latest",
  runtimeConfig: {
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
  },
});
