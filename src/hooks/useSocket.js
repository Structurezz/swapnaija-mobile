import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { useChatStore } from '../store/chat.store';
import { BASE_URL } from '../api/client';

// Strip "/api" suffix to get socket base
const SOCKET_URL = BASE_URL.replace('/api', '');

let socketInstance = null;

export function getSocket() {
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function useSocket(queryClient) {
  const { accessToken } = useAuthStore();
  const { updateConversation, setTyping, addOrUpdateConversation } = useChatStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
      });
    }

    socketRef.current = socketInstance;

    const onMessageNew = (msg) => {
      // Update conversation list
      updateConversation(msg.conversationId, {
        lastMessage: msg.content,
        lastMsgAt: msg.createdAt,
      });

      // Update React Query cache for the open conversation
      if (queryClient) {
        queryClient.setQueryData(['messages', msg.conversationId], (old) => {
          if (!old) return old;
          const pages = old.pages ?? old;
          if (Array.isArray(pages)) {
            // Flat array style
            const alreadyIn = pages.find((m) => m.id === msg.id);
            if (alreadyIn) return old;
            return [...pages, msg];
          }
          return old;
        });
      }
    };

    const onConvUpdated  = (data) => addOrUpdateConversation(data);
    const onTypingStart  = ({ conversationId, userId }) => setTyping(conversationId, userId, true);
    const onTypingStop   = ({ conversationId, userId }) => setTyping(conversationId, userId, false);

    socketInstance.on('message:new',          onMessageNew);
    socketInstance.on('conversation:updated', onConvUpdated);
    socketInstance.on('typing:start',         onTypingStart);
    socketInstance.on('typing:stop',          onTypingStop);

    return () => {
      socketInstance?.off('message:new',          onMessageNew);
      socketInstance?.off('conversation:updated', onConvUpdated);
      socketInstance?.off('typing:start',         onTypingStart);
      socketInstance?.off('typing:stop',          onTypingStop);
    };
  }, [accessToken, queryClient, updateConversation, setTyping, addOrUpdateConversation]);

  return socketRef.current;
}
