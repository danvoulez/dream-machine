export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@comark/nuxt", "eve/nuxt"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  experimental: {
    viewTransition: true,
  },
  compatibilityDate: "latest",
});
