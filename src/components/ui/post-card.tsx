import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Platform, Pressable, Share, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { ReactionBar, type ReactionKey } from '@/components/ui/reaction-bar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Post } from '@/data/content';
import { useStore } from '@/lib/store';

export type PostCardProps = {
  post: Post;
  onPress?: () => void;
  /** full = show entire text (detail view); preview clamps to 4 lines */
  full?: boolean;
};

export function PostCard({ post, onPress, full }: PostCardProps) {
  const { reactionFor, setReaction } = useStore();
  const reaction = reactionFor(post.id) as ReactionKey | null;
  const count = post.likes + (reaction ? 1 : 0);

  const stop = (e?: GestureResponderEvent) =>
    (e as unknown as { stopPropagation?: () => void } | undefined)?.stopPropagation?.();
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
        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSub} />
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
            {post.comments.length}
          </Txt>
        </View>
        <Pressable style={styles.action} onPress={share} hitSlop={6}>
          <Ionicons name="share-social-outline" size={18} color={Colors.textSub} />
        </Pressable>
      </View>
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
