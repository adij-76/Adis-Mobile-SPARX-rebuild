import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import type { WorkshopSummary } from '@/data/content';

export type WorkshopCardProps = {
  item: WorkshopSummary;
  onPress?: () => void;
};

/** List card used on the workshop browse / "See all" screen. */
export function WorkshopCard({ item, onPress }: WorkshopCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < item.rating ? 'star' : 'star-outline'}
                size={15}
                color={Colors.orange}
              />
            ))}
          </View>
          <Ionicons name="bookmark-outline" size={20} color={Colors.textMain} />
        </View>
        <Txt variant="titleSm">{item.title}</Txt>
        <Txt variant="bodySm" color={Colors.textSub} numberOfLines={2}>
          {item.description}
        </Txt>
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
  image: { width: '100%', height: 170, backgroundColor: Colors.soft },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stars: { flexDirection: 'row', gap: 2 },
});
