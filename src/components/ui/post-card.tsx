import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { ActionSheet, type SheetAction } from '@/components/ui/action-sheet';
import { ReactionBar, type ReactionKey } from '@/components/ui/reaction-bar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { type Post } from '@/data/content';
import { useCurrentAuthor } from '@/lib/auth';
import { chatId, useStore } from '@/lib/store';

export type PostCardProps = {
  post: Post;
  onPress?: () => void;
  /** full = show entire text (detail view); preview clamps to 4 lines */
  full?: boolean;
};

export function PostCard({ post, onPress, full }: PostCardProps) {
  const router = useRouter();
  const { reactionFor, setReaction, hidePost, deletePost } = useStore();
  const author = useCurrentAuthor();
  const reaction = reactionFor(post.id) as ReactionKey | null;
  const count = post.likes + (reaction ? 1 : 0);
  const [menu, setMenu] = useState(false);
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

  const startChat = () =>
    router.push(
      `/feed/chat?id=${chatId(post.author)}&name=${encodeURIComponent(post.author)}&avatar=${encodeURIComponent(post.avatar)}`,
    );

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
        { label: `Start chat with ${post.author}`, icon: 'chatbubble-ellipses-outline', onPress: startChat },
        { label: 'Copy link', icon: 'link-outline', onPress: copyLink },
        { label: 'Hide post', icon: 'eye-off-outline', onPress: () => hidePost(post.id) },
        { label: 'Report post', icon: 'flag-outline', destructive: true, onPress: () => hidePost(post.id) },
      ];

  const share = async (e?: GestureResponderEvent) => {
    stop(e);
    const message = `${post.author} in ${post.community}: ${post.text}`;
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
        <Image source={{ uri: post.avatar }} style={styles.avatar} />
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
            setMenu(true);
          }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSub} />
        </Pressable>
      </View>

      <Txt variant="bodySm" numberOfLines={full ? undefined : 4}>
        {post.text}
      </Txt>

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
        visible={menu}
        onClose={() => setMenu(false)}
        title={`${post.author} · ${post.community}`}
        actions={menuActions}
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
