import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Avatar } from '@/components/ui/avatar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useGoBack } from '@/hooks/use-go-back';
import { useCurrentAuthor } from '@/lib/auth';
import type { ChatMessage } from '@/api';

// How often to poll for new messages while the thread is open. Chat has no push
// channel yet, so a light poll keeps the conversation live enough for a DM.
const POLL_MS = 5000;

export default function ChatThread() {
  const goBack = useGoBack('/feed/messages');
  const router = useRouter();
  const { id, name, avatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const { appUserId } = useCurrentAuthor();

  const personName = name ?? 'Chat';
  const personAvatar = avatar ?? '';

  const { data, reload } = useAsync(() => api.messages.messages(id), [id]);
  // Optimistic messages we've sent but haven't seen echoed back by a reload yet.
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const server = data ?? [];
  const serverIds = new Set(server.map((m) => m.id));
  const messages = [...server, ...pending.filter((p) => !serverIds.has(p.id))];

  // Clear optimistic messages once the server catches up (avoids duplicates).
  useEffect(() => {
    if (data) setPending((p) => p.filter((m) => !serverIds.has(m.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Mark the other person's messages read on open, and poll for new ones.
  useEffect(() => {
    api.messages.markRead(id).catch(() => {});
    api.messages.blockedIds().then((ids) => setBlocked(ids.includes(id))).catch(() => {});
    const t = setInterval(() => {
      reload();
      api.messages.markRead(id).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      mine: true,
      text: body,
      time: 'now',
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setPending((p) => [...p, optimistic]);
    api.messages
      .send(id, body, appUserId)
      .then(() => reload())
      .catch(() => {});
  };

  const toggleBlock = () => {
    const next = !blocked;
    setBlocked(next);
    setMenuOpen(false);
    api.messages.setBlock(id, next, appUserId).catch(() => setBlocked(!next));
    if (next) router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textMain} />
        </Pressable>
        <Avatar uri={personAvatar} name={personName} size={36} />
        <Txt variant="titleSm" numberOfLines={1} style={{ flex: 1 }}>
          {personName}
        </Txt>
        <Pressable onPress={() => setMenuOpen((o) => !o)} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.textMain} />
        </Pressable>
      </View>

      {menuOpen ? (
        <Pressable style={styles.menu} onPress={toggleBlock}>
          <Ionicons
            name={blocked ? 'lock-open-outline' : 'ban-outline'}
            size={18}
            color={blocked ? Colors.textMain : Colors.danger}
          />
          <Txt variant="bodySm" color={blocked ? Colors.textMain : Colors.danger}>
            {blocked ? `Unblock ${personName}` : `Block ${personName}`}
          </Txt>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.strokeStrong} />
              <Txt variant="bodySm" color={Colors.textSub} center>
                Say hi to {personName} — this is the start of your conversation.
              </Txt>
            </View>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={[styles.bubble, m.mine ? styles.bubbleMe : styles.bubbleThem]}>
                <Txt variant="bodySm" color={m.mine ? Colors.white : Colors.textMain}>
                  {m.text}
                </Txt>
              </View>
            ))
          )}
        </ScrollView>

        {blocked ? (
          <View style={styles.blockedBar}>
            <Txt variant="bodySm" color={Colors.textSub} center>
              You blocked {personName}. Unblock to send a message.
            </Txt>
          </View>
        ) : (
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={`Message ${personName}…`}
              placeholderTextColor={Colors.textSub}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={send}
              disabled={!text.trim()}
              style={[styles.send, !text.trim() && { opacity: 0.5 }]}>
              <Ionicons name="arrow-up" size={20} color={Colors.white} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stroke,
    backgroundColor: Colors.white,
  },
  menu: {
    position: 'absolute',
    top: 60,
    right: Spacing.lg,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  body: { padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingTop: Spacing.xxl },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderBottomLeftRadius: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.stroke,
    backgroundColor: Colors.white,
  },
  blockedBar: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.stroke,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: Colors.screen,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textMain,
    fontSize: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
