import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useVimeoMeta } from '@/hooks/use-vimeo-meta';
import { gradientFor } from '@/lib/gradient';
import { useStore } from '@/lib/store';

/** Minimal shape the card needs — satisfied by both the static `WorkshopSummary`
 *  and a live `Workshop` (Lesson) mapped in the list. */
export type WorkshopCardItem = {
  id: string;
  title: string;
  description: string;
  rating?: number;
  image?: string | null;
  /** Used to derive a thumbnail when `image` is absent. */
  vimeoUrl?: string | null;
};

export type WorkshopCardProps = {
  item: WorkshopCardItem;
  onPress?: () => void;
};

/** List card used on the workshop browse / "See all" screen. */
export function WorkshopCard({ item, onPress }: WorkshopCardProps) {
  const { isFav, toggleFav } = useStore();
  const saved = isFav('lesson', item.id);
  // Fall back to the Vimeo thumbnail when the row has no stored image.
  const meta = useVimeoMeta(item.image ? null : item.vimeoUrl ?? null);
  const image = item.image || meta?.thumbnail || null;
  const rating = item.rating ?? 5;
  const onBookmark = (e: GestureResponderEvent) => {
    (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
    toggleFav('lesson', item.id);
  };
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.image}>
        {image ? (
          <Image source={{ uri: image }} style={styles.fill} contentFit="cover" />
        ) : (
          <>
            <LinearGradient
              colors={gradientFor(item.id)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            />
            <Ionicons name="easel" size={36} color="rgba(255,255,255,0.92)" />
          </>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < rating ? 'star' : 'star-outline'}
                size={15}
                color={Colors.orange}
              />
            ))}
          </View>
          <Pressable onPress={onBookmark} hitSlop={10}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={saved ? Colors.primary : Colors.textMain}
            />
          </Pressable>
        </View>
        <Txt variant="titleSm" numberOfLines={2}>{item.title}</Txt>
        {item.description ? (
          <Txt variant="bodySm" color={Colors.textSub} numberOfLines={2}>
            {item.description}
          </Txt>
        ) : null}
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
    overflow: 'hidden',
    ...Shadow.card,
  },
  image: {
    width: '100%',
    height: 170,
    backgroundColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stars: { flexDirection: 'row', gap: 2 },
});
