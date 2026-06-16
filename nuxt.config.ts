export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@comark/nuxt", "eve/nuxt", "@nuxthub/core"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  compatibilityDate: "latest",
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      title: "Personal Agent Template",
      titleTemplate: "%s",
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      meta: [
        {
          name: "description",
          content:
            "A durable personal AI assistant template built with Eve, Nuxt 4, and Better Auth.",
        },
        { name: "theme-color", content: "#1b1718" },
        { name: "color-scheme", content: "light dark" },
        { name: "robots", content: "index, follow" },
      ],
      link: [
        { rel: "icon", href: "/favicon.ico" },
      ],
    },
  },
  hub: {
    db: "sqlite",
  },
  runtimeConfig: {
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "",
    },
  },
});
