import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';

export default function ChatThread() {
  const router = useRouter();
  const { id, name, avatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const { chatFor, sendDm } = useStore();

  const thread = chatFor(id);
  const personName = thread?.name ?? name ?? 'Chat';
  const personAvatar = thread?.avatar ?? avatar ?? '';
  const messages = thread?.messages ?? [];
  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim()) return;
    sendDm(id, personName, personAvatar, text.trim());
    setText('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textMain} />
        </Pressable>
        {personAvatar ? <Image source={{ uri: personAvatar }} style={styles.avatar} /> : null}
        <Txt variant="titleSm" numberOfLines={1} style={{ flex: 1 }}>
          {personName}
        </Txt>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.strokeStrong} />
              <Txt variant="bodySm" color={Colors.textSub} center>
                Say hi to {personName} — this is the start of your conversation.
              </Txt>
            </View>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[styles.bubble, m.from === 'me' ? styles.bubbleMe : styles.bubbleThem]}>
                <Txt variant="bodySm" color={m.from === 'me' ? Colors.white : Colors.textMain}>
                  {m.text}
                </Txt>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${personName}…`}
            placeholderTextColor={Colors.textSub}
            style={styles.input}
            multiline
          />
          <Pressable onPress={send} disabled={!text.trim()} style={[styles.send, !text.trim() && { opacity: 0.5 }]}>
            <Ionicons name="arrow-up" size={20} color={Colors.white} />
          </Pressable>
        </View>
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
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.soft },
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
