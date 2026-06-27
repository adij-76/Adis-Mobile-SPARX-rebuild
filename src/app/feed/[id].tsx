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
import { ReactionBar, type ReactionKey } from '@/components/ui/reaction-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { user, type Comment } from '@/data/content';
import { useStore } from '@/lib/store';

function CommentItem({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) {
  const { commentReactionFor, setCommentReaction, repliesFor, addReply } = useStore();
  const reaction = commentReactionFor(comment.id) as ReactionKey | null;
  const replies = isReply ? [] : repliesFor(comment.id);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    addReply(comment.id, {
      id: `r${Date.now()}`,
      author: user.name,
      avatar: user.avatar,
      time: 'now',
      text: text.trim(),
    });
    setText('');
    setOpen(false);
  };

  return (
    <View style={[styles.commentBlock, isReply && styles.replyBlock]}>
      <View style={styles.comment}>
        <Image source={{ uri: comment.avatar }} style={styles.cAvatar} />
        <View style={styles.bubble}>
          <View style={styles.cHead}>
            <Txt variant="bodySmBold">{comment.author}</Txt>
            <Txt variant="caption" color={Colors.textSub}>
              {comment.time}
            </Txt>
          </View>
          <Txt variant="bodySm">{comment.text}</Txt>
        </View>
      </View>

      <View style={styles.cActions}>
        <ReactionBar
          compact
          reaction={reaction}
          count={reaction ? 1 : 0}
          onChange={(k) => setCommentReaction(comment.id, k)}
        />
        {!isReply && (
          <Pressable onPress={() => setOpen((o) => !o)} hitSlop={6}>
            <Txt variant="caption" color={Colors.textSub}>
              Reply
            </Txt>
          </Pressable>
        )}
      </View>

      {open && (
        <View style={styles.replyComposer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Reply to ${comment.author}…`}
            placeholderTextColor={Colors.textSub}
            style={styles.replyInput}
            autoFocus
          />
          <Pressable onPress={submit} style={styles.replySend}>
            <Txt variant="bodySmBold" color={Colors.white}>
              Reply
            </Txt>
          </Pressable>
        </View>
      )}

      {replies.map((r) => (
        <CommentItem key={r.id} comment={r} isReply />
      ))}
    </View>
  );
}

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
            <CommentItem key={c.id} comment={c} />
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
  commentBlock: { gap: Spacing.sm },
  replyBlock: { marginLeft: 44, marginTop: Spacing.sm },
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
  cActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginLeft: 48 },
  replyComposer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginLeft: 48 },
  replyInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textMain,
  },
  replySend: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
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
