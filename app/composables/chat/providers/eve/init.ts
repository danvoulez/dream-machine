import type { EveMessageData } from "eve/vue";
import type { UseEveAgentReturn } from "eve/vue";
import { recordAuthorizationEvent } from "~/composables/chat/useAuthorizationChallenges";
import { recordStreamEvent } from "./stream-log";

const agentsByChatId = new Map<string, UseEveAgentReturn<EveMessageData>>();

export function getOrCreateEveAgent(chatId: string) {
  let agent = agentsByChatId.get(chatId);
  if (!agent) {
    agent = useEveAgent({
      onEvent: (event) => {
        if (event.type === "authorization.required" || event.type === "authorization.completed") {
          recordAuthorizationEvent(event);
        }

        if (!import.meta.dev) return;
        recordStreamEvent(event.type);
      },
    });
    agentsByChatId.set(chatId, agent);
  }
  return agent;
}

export function resetEveAgent(chatId: string) {
  agentsByChatId.get(chatId)?.reset();
}

export function resetAllEveAgents() {
  for (const agent of agentsByChatId.values()) {
    agent.reset();
  }
  agentsByChatId.clear();
}

/** Kept for the client plugin; sessions are created lazily per chat id. */
export function initEveChat() {
  return getOrCreateEveAgent("default");
}
