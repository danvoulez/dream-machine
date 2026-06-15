export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server) return;

  if (to.path === "/chat" && from.path === "/chat") {
    to.meta.viewTransition = false;
  }
});
