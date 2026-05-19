import React, { useEffect, useRef } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { getConversations } from '../../../src/api/messages.api';
import { useChatStore } from '../../../src/store/chat.store';
import { useAuthStore } from '../../../src/store/auth.store';
import { COLORS } from '../../../src/utils/currency';
import Avatar from '../../../src/components/ui/Avatar';
import Spinner from '../../../src/components/ui/Spinner';

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const listRef = useRef(null);
  useScrollToTop(listRef);
  const { setConversations, conversations } = useChatStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (data) {
      const convs = data?.conversations ?? data ?? [];
      setConversations(convs);
    }
  }, [data]);

  const displayConvs = conversations.length > 0
    ? conversations
    : (data?.conversations ?? data ?? []);

  const renderItem = ({ item }) => {
    const other = item.participantA?.id === user?.id ? item.participantB : item.participantA;
    const otherName = other?.fullName || other?.email || 'User';
    const unread = item.unread || 0;

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push(`/chat/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrap}>
          <Avatar uri={other?.avatarUrl} name={otherName} size={50} />
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemTop}>
            <Text style={[styles.itemName, unread > 0 && styles.itemNameBold]} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={styles.itemTime}>
              {item.lastMsgAt || item.updatedAt
                ? formatDistanceToNow(new Date(item.lastMsgAt || item.updatedAt), { addSuffix: true })
                : ''}
            </Text>
          </View>
          <Text
            style={[styles.itemMsg, unread > 0 && styles.itemMsgBold]}
            numberOfLines={1}
          >
            {item.lastMessage || 'Start a conversation'}
          </Text>
          {item.swapId && (
            <View style={styles.swapTag}>
              <Ionicons name="swap-horizontal" size={11} color={COLORS.primary} />
              <Text style={styles.swapTagText}>Swap #{item.swapId?.id?.slice(-6)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {isLoading ? (
        <Spinner full />
      ) : (
        <FlatList
          ref={listRef}
          data={displayConvs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={56} color={COLORS.gray300} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Find a listing you like and message the owner!
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  unreadText: { fontSize: 10, color: COLORS.white, fontWeight: '700' },

  itemContent: { flex: 1, gap: 3 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '500', color: COLORS.text, flex: 1 },
  itemNameBold: { fontWeight: '700' },
  itemTime: { fontSize: 12, color: COLORS.textLight },
  itemMsg: { fontSize: 13, color: COLORS.textSecondary },
  itemMsgBold: { color: COLORS.text, fontWeight: '600' },
  swapTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  swapTagText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 82 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
