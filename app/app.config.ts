export default defineAppConfig({
  site: {
    name: "Personal Agent Template",
    title: "Personal Agent Template",
    description:
      "A durable personal AI assistant template built with Eve, Nuxt 4, and Better Auth. Web chat, Slack, Linear, and long-term memory.",
    tagline: "Vercel × Eve",
    author: "Hugo Richard",
    repo: "https://github.com/HugoRCD/personal-agent-template",
    deployUrl:
      "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FHugoRCD%2Fpersonal-agent-template&env=BETTER_AUTH_SECRET,BETTER_AUTH_URL,INTERNAL_API_SECRET&envDescription=BETTER_AUTH_SECRET%3A%20run%20openssl%20rand%20-base64%2032%20%7C%20BETTER_AUTH_URL%3A%20your%20production%20URL%20%7C%20INTERNAL_API_SECRET%3A%20shared%20secret%20for%20web%20%2B%20eve&envLink=https%3A%2F%2Fgithub.com%2FHugoRCD%2Fpersonal-agent-template%2Fblob%2Fmain%2Fdocs%2FENVIRONMENT.md&project-name=personal-agent&repository-name=personal-agent",
    ogImage: "/og.png",
    twitter: "@hugorcd",
  },
  ui: {
    colors: {
      primary: "neutral",
      neutral: "neutral",
    },
    button: {
      slots: {
        base: "active:translate-y-px transition-transform duration-200",
      },
      defaultVariants: {
        size: "sm",
      },
    },
  },
});
