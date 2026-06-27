import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
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

import { PostCard } from '@/components/ui/post-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { user } from '@/data/content';
import { useStore } from '@/lib/store';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { allPosts, addComment } = useStore();
  const post = allPosts.find((p) => p.id === id) ?? allPosts[0];
  const comments = post.comments;
  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim()) return;
    addComment(post.id, {
      id: `c${Date.now()}`,
      author: user.name,
      avatar: user.avatar,
      time: 'now',
      text: text.trim(),
    });
    setText('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Post" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <PostCard post={post} full />

          <Txt variant="titleSm">Comments ({comments.length})</Txt>
          {comments.map((c) => (
            <View key={c.id} style={styles.comment}>
              <Image source={{ uri: c.avatar }} style={styles.cAvatar} />
              <View style={styles.bubble}>
                <View style={styles.cHead}>
                  <Txt variant="bodySmBold">{c.author}</Txt>
                  <Txt variant="caption" color={Colors.textSub}>
                    {c.time}
                  </Txt>
                </View>
                <Txt variant="bodySm">{c.text}</Txt>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment…"
            placeholderTextColor={Colors.textSub}
            style={styles.input}
            multiline
          />
          <Pressable onPress={send} style={styles.send}>
            <Txt variant="bodySmBold" color={Colors.white}>
              Post
            </Txt>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  comment: { flexDirection: 'row', gap: Spacing.md },
  cAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.soft },
  bubble: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.md,
    gap: 2,
  },
  cHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
    maxHeight: 100,
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textMain,
  },
  send: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
});
