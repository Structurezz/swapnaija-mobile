import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  typingUsers: {},

  setConversations: (convs) => set({ conversations: convs }),

  updateConversation: (conversationId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...updates } : c
      ),
    })),

  addOrUpdateConversation: (conv) =>
    set((state) => {
      const exists = state.conversations.find((c) => c.id === conv.id);
      if (exists) {
        return {
          conversations: state.conversations.map((c) =>
            c.id === conv.id ? { ...c, ...conv } : c
          ),
        };
      }
      return { conversations: [conv, ...state.conversations] };
    }),

  setActiveConversationId: (id) => set({ activeConversationId: id }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = new Set(state.typingUsers[conversationId] || []);
      if (isTyping) current.add(userId);
      else current.delete(userId);
      return {
        typingUsers: { ...state.typingUsers, [conversationId]: current },
      };
    }),

  markRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread: 0 } : c
      ),
    })),

  getTotalUnread: () =>
    get().conversations.reduce((acc, c) => acc + (c.unread || 0), 0),
}));
