export default defineAppConfig({
  site: {
    name: "Dream Machine",
    title: "Dream Machine",
    description:
      "Processual UI for Dream Machine: read-only portal projections over LogLine and Envelope.",
    tagline: "Portal Chief",
    author: "Dream Machine",
    repo: "",
    deployUrl: "",
    ogImage: "/og.png",
    twitter: "",
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
