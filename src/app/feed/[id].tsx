import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import type { PostComment } from '@/api/types';
import { PostCard } from '@/components/ui/post-card';
import { ReactionBar, type ReactionKey } from '@/components/ui/reaction-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useCurrentAuthor } from '@/lib/auth';
import { useStore } from '@/lib/store';

function ReplyBubble({ comment }: { comment: PostComment }) {
  return (
    <View style={styles.replyBlock}>
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
    </View>
  );
}

function CommentItem({
  comment,
  replies,
  onReply,
}: {
  comment: PostComment;
  replies: PostComment[];
  onReply: (parentRef: string, text: string) => void;
}) {
  const { commentReactionFor, setCommentReaction } = useStore();
  const reaction = commentReactionFor(comment.id) as ReactionKey | null;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onReply(comment.id, text.trim());
    setText('');
    setOpen(false);
  };

  return (
    <View style={styles.commentBlock}>
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
        <Pressable onPress={() => setOpen((o) => !o)} hitSlop={6}>
          <Txt variant="caption" color={Colors.textSub}>
            Reply
          </Txt>
        </Pressable>
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
        <ReplyBubble key={r.id} comment={r} />
      ))}
    </View>
  );
}

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const author = useCurrentAuthor();
  const postQ = useAsync(() => api.posts.post(id), [id]);
  const commentsQ = useAsync(() => api.posts.comments(id), [id]);
  const post = postQ.data;
  const comments = commentsQ.data ?? [];
  const [text, setText] = useState('');

  const topLevel = comments.filter((c) => !c.parentRef);
  const repliesOf = (cid: string) => comments.filter((c) => c.parentRef === cid);

  const addReply = (parentRef: string, body: string) => {
    api.posts
      .createComment({ postRef: id, parentRef, text: body, appUserId: author.appUserId })
      .then(() => commentsQ.reload())
      .catch(() => {});
  };
  const send = () => {
    if (!text.trim()) return;
    const body = text.trim();
    setText('');
    api.posts
      .createComment({ postRef: id, text: body, appUserId: author.appUserId })
      .then(() => commentsQ.reload())
      .catch(() => {});
  };

  if (!post) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Post" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {postQ.loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Txt variant="bodySm" color={Colors.textSub}>
              Post not found.
            </Txt>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Post" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <PostCard post={post} full />

          <Txt variant="titleSm">Comments ({comments.length})</Txt>
          {topLevel.map((c) => (
            <CommentItem key={c.id} comment={c} replies={repliesOf(c.id)} onReply={addReply} />
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
