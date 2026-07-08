import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { api } from '@/api';
import { ActionSheet, type SheetAction } from '@/components/ui/action-sheet';
import { Avatar } from '@/components/ui/avatar';
import { ReactionBar, type ReactionKey } from '@/components/ui/reaction-bar';
import { RichText } from '@/components/ui/rich-text';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { type Post } from '@/data/content';
import { htmlToText } from '@/lib/html';
import { useCurrentAuthor } from '@/lib/auth';
import { useStore } from '@/lib/store';

export type PostCardProps = {
  post: Post;
  onPress?: () => void;
  /** full = show entire text (detail view); preview clamps to 4 lines */
  full?: boolean;
};

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech',
  'Spam or a scam',
  'Self-harm or dangerous content',
  'Inappropriate content',
  'Something else',
];

export function PostCard({ post, onPress, full }: PostCardProps) {
  const router = useRouter();
  const { reactionFor, setReaction, hidePost, deletePost, reportPost, blockAuthor } = useStore();
  const author = useCurrentAuthor();
  const reaction = reactionFor(post.id) as ReactionKey | null;
  const count = post.likes + (reaction ? 1 : 0);
  // null = closed; otherwise which sheet is open.
  const [sheet, setSheet] = useState<null | 'menu' | 'report' | 'block' | 'done-report' | 'done-block'>(null);
  const isOwn = post.author === author.name;

  const stop = (e?: GestureResponderEvent) =>
    (e as unknown as { stopPropagation?: () => void } | undefined)?.stopPropagation?.();

  const copyLink = async () => {
    const url = `https://adij-76.github.io/Adis-Mobile-SPARX-rebuild/feed/${post.id}`;
    if (Platform.OS === 'web') {
      const nav = (globalThis as { navigator?: any }).navigator;
      try {
        await nav?.clipboard?.writeText(url);
      } catch {
        /* ignore */
      }
    } else {
      try {
        await Share.share({ message: url });
      } catch {
        /* cancelled */
      }
    }
  };

  // DM the post author: find-or-create the 1:1 conversation, then open it. Seed
  // posts (and any post whose author id the view didn't resolve) have no id, and
  // a blocked author yields no conversation → fall back to the messages list.
  const startChat = async () => {
    if (!post.authorId) {
      router.push('/feed/messages');
      return;
    }
    const convId = await api.messages.startDirect(post.authorId);
    router.push(
      convId
        ? `/feed/chat?id=${convId}&name=${encodeURIComponent(post.author)}&avatar=${encodeURIComponent(post.avatar)}&peer=${post.authorId}`
        : '/feed/messages',
    );
  };

  const menuActions: SheetAction[] = isOwn
    ? [
        { label: 'Copy link', icon: 'link-outline', onPress: copyLink },
        {
          label: 'Delete post',
          icon: 'trash-outline',
          destructive: true,
          // Local delete for seed posts; hide removes a real (server) post from
          // view until server-side soft-delete lands.
          onPress: () => {
            deletePost(post.id);
            hidePost(post.id);
          },
        },
      ]
    : [
        ...(post.authorId
          ? [{ label: `Start chat with ${post.author}`, icon: 'chatbubble-ellipses-outline' as const, onPress: startChat }]
          : []),
        { label: 'Copy link', icon: 'link-outline', onPress: copyLink },
        { label: 'Hide post', icon: 'eye-off-outline', onPress: () => hidePost(post.id) },
        // Report → reason picker (records the report + hides). Distinct from Hide.
        { label: 'Report post', icon: 'flag-outline', destructive: true, onPress: () => setSheet('report') },
        // Block → confirm, then their content disappears from every feed.
        { label: `Block ${post.author}`, icon: 'ban-outline', destructive: true, onPress: () => setSheet('block') },
      ];

  const reportActions: SheetAction[] = REPORT_REASONS.map((reason) => ({
    label: reason,
    icon: 'flag-outline' as const,
    onPress: () => {
      reportPost(post.id);
      setSheet('done-report');
    },
  }));

  const blockActions: SheetAction[] = [
    {
      label: `Block ${post.author}`,
      icon: 'ban-outline',
      destructive: true,
      onPress: () => {
        blockAuthor(post.author);
        setSheet('done-block');
      },
    },
  ];

  const share = async (e?: GestureResponderEvent) => {
    stop(e);
    const message = `${post.author} in ${post.community}: ${htmlToText(post.text)}`;
    if (Platform.OS === 'web') {
      const nav = (globalThis as { navigator?: any }).navigator;
      try {
        if (nav?.share) await nav.share({ text: message });
        else await nav?.clipboard?.writeText(message);
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await Share.share({ message });
      } catch {
        /* cancelled */
      }
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && { opacity: 0.95 }]}>
      <View style={styles.head}>
        <Avatar uri={post.avatar} name={post.author} size={40} />
        <View style={{ flex: 1 }}>
          <Txt variant="bodySmBold">{post.author}</Txt>
          <Txt variant="caption" color={Colors.textSub}>
            {post.community} · {post.time}
          </Txt>
        </View>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Post options"
          onPress={(e) => {
            stop(e);
            setSheet('menu');
          }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSub} />
        </Pressable>
      </View>

      <RichText html={post.text} numberOfLines={full ? undefined : 4} />

      {post.image ? <Image source={{ uri: post.image }} style={styles.image} /> : null}

      <View style={styles.actions}>
        <ReactionBar
          reaction={reaction}
          count={count}
          onChange={(k) => setReaction(post.id, k)}
          stopParent
        />

        <View style={styles.action}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.textSub} />
          <Txt variant="caption" color={Colors.textSub}>
            {post.commentsCount ?? post.comments.length}
          </Txt>
        </View>
        <Pressable style={styles.action} onPress={share} hitSlop={6}>
          <Ionicons name="share-social-outline" size={18} color={Colors.textSub} />
        </Pressable>
      </View>

      <ActionSheet
        visible={sheet === 'menu'}
        onClose={() => setSheet(null)}
        title={`${post.author} · ${post.community}`}
        actions={menuActions}
      />
      <ActionSheet
        visible={sheet === 'report'}
        onClose={() => setSheet(null)}
        title="Why are you reporting this post?"
        actions={reportActions}
      />
      <ActionSheet
        visible={sheet === 'block'}
        onClose={() => setSheet(null)}
        title={`Block ${post.author}? You won't see their posts or comments.`}
        actions={blockActions}
      />
      <ActionSheet
        visible={sheet === 'done-report'}
        onClose={() => setSheet(null)}
        title="Thanks — this post is now hidden and flagged for our team to review."
        actions={[{ label: 'Done', icon: 'checkmark-circle-outline', onPress: () => setSheet(null) }]}
      />
      <ActionSheet
        visible={sheet === 'done-block'}
        onClose={() => setSheet(null)}
        title={`${post.author} is blocked. You can unblock them in Settings → Blocked accounts.`}
        actions={[{ label: 'Done', icon: 'checkmark-circle-outline', onPress: () => setSheet(null) }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.soft },
  image: { width: '100%', height: 180, borderRadius: Radius.md, backgroundColor: Colors.soft },
  actions: { flexDirection: 'row', gap: Spacing.xl, paddingTop: Spacing.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
