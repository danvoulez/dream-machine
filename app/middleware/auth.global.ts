import { authClient } from "~/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") {
    return;
  }

  const config = useRuntimeConfig();
  const acceptanceOn = config.public.dreamMachineAcceptance === true || config.dreamMachineAcceptance === true;
  if (acceptanceOn && to.path.startsWith("/acceptance")) {
    return;
  }

  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: useRequestHeaders(["cookie"]) as HeadersInit,
    },
  });

  if (!session) {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }
});
