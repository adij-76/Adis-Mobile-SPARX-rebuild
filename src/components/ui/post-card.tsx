import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import type { Post } from '@/data/content';

const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Like', color: '#2F6BFF' },
  { key: 'celebrate', emoji: '👏', label: 'Celebrate', color: '#38C793' },
  { key: 'support', emoji: '🫶', label: 'Support', color: '#7A5AF8' },
  { key: 'love', emoji: '❤️', label: 'Love', color: '#EE6A8C' },
  { key: 'insightful', emoji: '💡', label: 'Insightful', color: '#F5A623' },
  { key: 'funny', emoji: '😄', label: 'Funny', color: '#2BB3E0' },
  { key: 'dislike', emoji: '👎', label: 'Dislike', color: '#8593A8' },
] as const;

type ReactionKey = (typeof REACTIONS)[number]['key'];

export type PostCardProps = {
  post: Post;
  onPress?: () => void;
  /** full = show entire text (detail view); preview clamps to 4 lines */
  full?: boolean;
};

export function PostCard({ post, onPress, full }: PostCardProps) {
  const [reaction, setReaction] = useState<ReactionKey | null>(null);
  const [picker, setPicker] = useState(false);

  const active = reaction ? REACTIONS.find((r) => r.key === reaction) ?? null : null;
  const count = post.likes + (reaction ? 1 : 0);

  const stop = (e?: GestureResponderEvent) =>
    (e as unknown as { stopPropagation?: () => void } | undefined)?.stopPropagation?.();
  // Tap the Like button to reveal the reaction options (LinkedIn-style).
  const togglePicker = (e?: GestureResponderEvent) => {
    stop(e);
    setPicker((o) => !o);
  };
  const choose = (e: GestureResponderEvent, k: ReactionKey) => {
    stop(e);
    setReaction((r) => (r === k ? null : k)); // tapping the active reaction clears it
    setPicker(false);
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
        <View style={styles.reactWrap}>
          {picker && (
            <>
              <Pressable
                style={styles.pickerOverlay}
                onPress={(e) => {
                  stop(e);
                  setPicker(false);
                }}
              />
              <View style={styles.picker}>
                {REACTIONS.map((r) => (
                  <Pressable
                    key={r.key}
                    onPress={(e) => choose(e, r.key)}
                    hitSlop={4}
                    style={({ pressed }) => [styles.pickerItem, pressed && { transform: [{ scale: 1.25 }] }]}>
                    <Txt style={styles.pickerEmoji}>{r.emoji}</Txt>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          <Pressable style={styles.action} onPress={togglePicker} hitSlop={6}>
            {active ? (
              <Txt style={styles.reactEmoji}>{active.emoji}</Txt>
            ) : (
              <Ionicons name="heart-outline" size={18} color={Colors.textSub} />
            )}
            <Txt variant="caption" color={active ? active.color : Colors.textSub}>
              {active ? active.label : 'Like'}
              {count > 0 ? ` · ${count}` : ''}
            </Txt>
          </Pressable>
        </View>

        <View style={styles.action}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.textSub} />
          <Txt variant="caption" color={Colors.textSub}>
            {post.comments.length}
          </Txt>
        </View>
        <Pressable style={styles.action} onPress={stop} hitSlop={6}>
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
  reactWrap: { position: 'relative' },
  reactEmoji: { fontSize: 16 },
  pickerOverlay: { position: 'absolute', top: -600, bottom: -200, left: -200, right: -600, zIndex: 10 },
  picker: {
    position: 'absolute',
    bottom: 28,
    left: -6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.stroke,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    zIndex: 20,
    ...Shadow.card,
  },
  pickerItem: { paddingHorizontal: 2 },
  pickerEmoji: { fontSize: 24 },
});
