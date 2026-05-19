import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { getConversation, getMessages, sendMessage } from '../../../src/api/messages.api';
import { useAuthStore } from '../../../src/store/auth.store';
import { useChatStore } from '../../../src/store/chat.store';
import { getSocket } from '../../../src/hooks/useSocket';
import { COLORS } from '../../../src/utils/currency';
import Avatar from '../../../src/components/ui/Avatar';
import Spinner from '../../../src/components/ui/Spinner';

function TypingDots() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={typingStyles.wrap}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            typingStyles.dot,
            {
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: i === 1 ? [0.3, 1] : [1, 0.3],
              }),
              transform: [{
                translateY: anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: i === 1 ? [-3, 3, -3] : [0, 0, 0],
                }),
              }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.gray100, borderRadius: 18, borderBottomLeftRadius: 4, alignSelf: 'flex-start', marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gray400 },
});

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { typingUsers, markRead, conversations } = useChatStore();
  const [text, setText] = useState('');
  const flatRef = useRef(null);
  const typingTimerRef = useRef(null);

  const { data: conv } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => getConversation(id),
  });

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => getMessages(id, { limit: 50 }),
  });

  // Socket room join/leave
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit('conversation:join', id);
    }
    markRead(id);
    return () => {
      const s = getSocket();
      if (s) s.emit('conversation:leave', id);
    };
  }, [id]);

  // Listen for new messages in this conversation
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (msg) => {
      if (msg.conversationId !== id) return;
      if ((msg.senderId?.id ?? msg.sender?.id) === user?.id) return; // skip own (handled via optimistic)

      queryClient.setQueryData(['messages', id], (old) => {
        const arr = old?.messages ?? old ?? [];
        if (arr.find((m) => m.id === msg.id)) return old;
        const newArr = [...arr, msg];
        return old?.messages ? { ...old, messages: newArr } : newArr;
      });
    };

    socket.on('message:new', handler);
    return () => socket.off('message:new', handler);
  }, [id, user?.id, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content) => sendMessage(id, content),
    onMutate: async (content) => {
      const tempId = `temp-${Date.now()}`;
      const tempMsg = {
        id: tempId,
        content,
        sender: { id: user?.id, name: user?.fullName },
        conversationId: id,
        createdAt: new Date().toISOString(),
        _temp: true,
      };
      queryClient.setQueryData(['messages', id], (old) => {
        const arr = old?.messages ?? old ?? [];
        const newArr = [...arr, tempMsg];
        return old?.messages ? { ...old, messages: newArr } : newArr;
      });
      return { tempId };
    },
    onSuccess: (realMsg, _, ctx) => {
      queryClient.setQueryData(['messages', id], (old) => {
        const arr = old?.messages ?? old ?? [];
        const newArr = arr.map((m) => m.id === ctx.tempId ? realMsg : m);
        return old?.messages ? { ...old, messages: newArr } : newArr;
      });
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(['messages', id], (old) => {
        const arr = old?.messages ?? old ?? [];
        const newArr = arr.filter((m) => m.id !== ctx?.tempId);
        return old?.messages ? { ...old, messages: newArr } : newArr;
      });
    },
  });

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    sendMutation.mutate(content);
    stopTyping();
  };

  const emitTyping = useCallback(() => {
    const socket = getSocket();
    if (socket) socket.emit('typing:start', { conversationId: id });
  }, [id]);

  const stopTyping = useCallback(() => {
    const socket = getSocket();
    if (socket) socket.emit('typing:stop', { conversationId: id });
    clearTimeout(typingTimerRef.current);
  }, [id]);

  const handleTextChange = (val) => {
    setText(val);
    if (val.trim()) {
      emitTyping();
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(stopTyping, 2000);
    } else {
      stopTyping();
    }
  };

  const messages = messagesData?.messages ?? messagesData ?? [];
  const typers   = typingUsers[id] ? [...typingUsers[id]].filter((uid) => uid !== user?.id) : [];

  // Use cached list conversation as fallback while getConversation loads
  const cachedConv = conversations.find((c) => c.id === id);
  const convData = conv ?? cachedConv;
  const other = convData?.participantA?.id === user?.id ? convData?.participantB : convData?.participantA;
  const otherName = other?.fullName || other?.name || other?.email || 'User';

  const renderMessage = ({ item }) => {
    const isMe = (item.senderId?.id ?? item.sender?.id) === user?.id;
    return (
      <View style={[styles.msgWrap, isMe ? styles.msgRight : styles.msgLeft]}>
        {!isMe && <Avatar uri={other?.avatarUrl} name={otherName} size={28} style={styles.msgAvatar} />}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, item._temp && styles.bubbleTemp]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {item.createdAt ? format(new Date(item.createdAt), 'HH:mm') : ''}
            {isMe && item._temp && (
              <Text>  <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.6)" /></Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Avatar uri={other?.avatarUrl} name={otherName} size={36} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherName}</Text>
          {other?.verification === 'verified' && (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <Spinner full />
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            typers.length > 0 ? (
              <View style={styles.typing}>
                <Avatar uri={other?.avatarUrl} name={otherName} size={24} />
                <TypingDots />
              </View>
            ) : null
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textLight}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Ionicons name="send" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, gap: 2 },
  headerName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  messagesList: { padding: 16, paddingBottom: 8 },

  msgWrap: { flexDirection: 'row', marginBottom: 6, gap: 8 },
  msgLeft: { justifyContent: 'flex-start' },
  msgRight: { justifyContent: 'flex-end' },
  msgAvatar: { alignSelf: 'flex-end' },

  bubble: {
    maxWidth: '72%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleTemp: { opacity: 0.7 },
  bubbleText: { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  bubbleTextMe: { color: COLORS.white },
  bubbleTime: { fontSize: 10, color: COLORS.textLight, marginTop: 3, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },

  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingBottom: 8 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.gray300 },
});
