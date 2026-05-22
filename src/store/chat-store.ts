import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChatMessage } from "@/types/normie";

const SESSION_TIMEOUT_MS = 5 * 60 * 60 * 1000; // 5 hours

interface ChatState {
  chats: Record<number, ChatMessage[]>;
  lastActivity: Record<number, number>; // tokenId -> timestamp (ms)
  addMessage: (tokenId: number, message: ChatMessage) => void;
  clearChat: (tokenId: number) => void;
  isSessionExpired: (tokenId: number) => boolean;
  refreshIfExpired: (tokenId: number) => boolean;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: {},
      lastActivity: {},

      addMessage: (tokenId, message) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [tokenId]: [...(state.chats[tokenId] || []), message],
          },
          lastActivity: {
            ...state.lastActivity,
            [tokenId]: Date.now(),
          },
        })),

      clearChat: (tokenId) =>
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [tokenId]: _chat, ...restChats } = state.chats;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [tokenId]: _time, ...restActivity } = state.lastActivity;
          return { chats: restChats, lastActivity: restActivity };
        }),

      isSessionExpired: (tokenId) => {
        const lastTime = get().lastActivity[tokenId];
        if (!lastTime) return false; // no session yet
        return Date.now() - lastTime > SESSION_TIMEOUT_MS;
      },

      refreshIfExpired: (tokenId) => {
        const state = get();
        const lastTime = state.lastActivity[tokenId];
        if (lastTime && Date.now() - lastTime > SESSION_TIMEOUT_MS) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [tokenId]: _chat, ...restChats } = state.chats;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [tokenId]: _time, ...restActivity } = state.lastActivity;
          set({ chats: restChats, lastActivity: restActivity });
          return true; // session was refreshed
        }
        return false;
      },
    }),
    { name: "normie-chat-storage" }
  )
);
