import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { WorkshopScaffold } from '@/components/workshop-scaffold';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { workshop } from '@/data/content';
import { useStore } from '@/lib/store';

export default function WorkshopIntro() {
  const { isFav, toggleFav } = useStore();
  const saved = isFav('lesson', workshop.id);
  return (
    <WorkshopScaffold current={0} next="/workshop/video">
      <Image
        source={{ uri: workshop.hero }}
        style={{ width: '100%', height: 190, borderRadius: Radius.md, backgroundColor: Colors.soft }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons
              key={i}
              name={i < workshop.rating ? 'star' : 'star-outline'}
              size={18}
              color={Colors.orange}
            />
          ))}
        </View>
        <Pressable onPress={() => toggleFav('lesson', workshop.id)} hitSlop={10}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <Txt variant="title">{workshop.title}</Txt>

      <View style={{ gap: Spacing.sm }}>
        <Txt variant="bodyMedium">Introduction</Txt>
        <Txt variant="body" color={Colors.textSub}>
          {workshop.intro}
        </Txt>
      </View>
    </WorkshopScaffold>
  );
}
