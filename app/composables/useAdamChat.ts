import type { EveMessageData } from "eve/vue";
import type { UseEveAgentReturn } from "eve/vue";

let chat: UseEveAgentReturn<EveMessageData> | undefined;
let pendingMessage: string | null = null;

export function useAdamChat() {
  if (!chat) {
    chat = useEveAgent();
  }
  return chat;
}

/** Navigate to /chat immediately; the stream starts on the chat page (like the Nuxt UI template). */
export async function startChat(message: string) {
  const text = message.trim();
  if (!text) return;

  pendingMessage = text;
  await navigateTo("/chat");
}

export function consumePendingMessage() {
  const text = pendingMessage;
  pendingMessage = null;
  return text;
}

export async function startNewChat() {
  pendingMessage = null;
  chat?.reset();
  await navigateTo("/");
}
