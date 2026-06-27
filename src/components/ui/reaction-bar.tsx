import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

export const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Like', color: '#2F6BFF' },
  { key: 'celebrate', emoji: '👏', label: 'Celebrate', color: '#38C793' },
  { key: 'support', emoji: '🫶', label: 'Support', color: '#7A5AF8' },
  { key: 'love', emoji: '❤️', label: 'Love', color: '#EE6A8C' },
  { key: 'insightful', emoji: '💡', label: 'Insightful', color: '#F5A623' },
  { key: 'funny', emoji: '😄', label: 'Funny', color: '#2BB3E0' },
  { key: 'dislike', emoji: '👎', label: 'Dislike', color: '#8593A8' },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]['key'];

/**
 * Tap-to-reveal reaction control (LinkedIn-style). Reused for posts + comments.
 * `stopParent` stops the press bubbling to an enclosing pressable card.
 */
export function ReactionBar({
  reaction,
  count = 0,
  onChange,
  stopParent,
  compact,
}: {
  reaction: ReactionKey | null;
  count?: number;
  onChange: (k: ReactionKey | null) => void;
  stopParent?: boolean;
  compact?: boolean;
}) {
  const [picker, setPicker] = useState(false);
  const active = reaction ? REACTIONS.find((r) => r.key === reaction) ?? null : null;
  const stop = (e?: GestureResponderEvent) => {
    if (stopParent) (e as unknown as { stopPropagation?: () => void } | undefined)?.stopPropagation?.();
  };

  return (
    <View style={styles.wrap}>
      {picker && (
        <>
          <Pressable
            style={styles.overlay}
            onPress={(e) => {
              stop(e);
              setPicker(false);
            }}
          />
          <View style={styles.picker}>
            {REACTIONS.map((r) => (
              <Pressable
                key={r.key}
                hitSlop={4}
                onPress={(e) => {
                  stop(e);
                  onChange(reaction === r.key ? null : r.key);
                  setPicker(false);
                }}
                style={({ pressed }) => [styles.pickerItem, pressed && { transform: [{ scale: 1.25 }] }]}>
                <Txt style={styles.pickerEmoji}>{r.emoji}</Txt>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Pressable
        style={styles.action}
        hitSlop={6}
        onPress={(e) => {
          stop(e);
          setPicker((o) => !o);
        }}>
        {active ? (
          <Txt style={[styles.reactEmoji, compact && { fontSize: 14 }]}>{active.emoji}</Txt>
        ) : (
          <Ionicons name="heart-outline" size={compact ? 15 : 18} color={Colors.textSub} />
        )}
        <Txt variant="caption" color={active ? active.color : Colors.textSub}>
          {active ? active.label : 'Like'}
          {count > 0 ? ` · ${count}` : ''}
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  reactEmoji: { fontSize: 16 },
  overlay: { position: 'absolute', top: -600, bottom: -200, left: -200, right: -600, zIndex: 10 },
  picker: {
    position: 'absolute',
    bottom: 26,
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
