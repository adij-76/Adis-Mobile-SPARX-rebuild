import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Post } from '@/data/content';

export type PostCardProps = {
  post: Post;
  onPress?: () => void;
  /** full = show entire text (detail view); preview clamps to 4 lines */
  full?: boolean;
};

export function PostCard({ post, onPress, full }: PostCardProps) {
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
        <View style={styles.action}>
          <Ionicons name="heart-outline" size={18} color={Colors.textSub} />
          <Txt variant="caption" color={Colors.textSub}>
            {post.likes}
          </Txt>
        </View>
        <View style={styles.action}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.textSub} />
          <Txt variant="caption" color={Colors.textSub}>
            {post.comments.length}
          </Txt>
        </View>
        <View style={styles.action}>
          <Ionicons name="share-social-outline" size={18} color={Colors.textSub} />
        </View>
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
