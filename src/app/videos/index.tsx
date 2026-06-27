import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { recommendedVideos } from '@/data/content';

export default function VideosList() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Recommended Videos" />
      <FlatList
        data={recommendedVideos}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            onPress={() => router.push(`/videos/${item.id}`)}>
            <View>
              <Image source={{ uri: item.image }} style={styles.thumb} />
              <View style={styles.duration}>
                <Txt variant="caption" color={Colors.white}>
                  {item.duration}
                </Txt>
              </View>
              <View style={styles.play}>
                <Ionicons name="play" size={18} color={Colors.primaryDark} />
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodySmBold" numberOfLines={2}>
                {item.title}
              </Txt>
              <Txt variant="caption" color={Colors.textSub}>
                {item.presenter} · {item.views}
              </Txt>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  list: { padding: Spacing.lg, gap: Spacing.lg },
  card: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  thumb: { width: 130, height: 84, borderRadius: Radius.md, backgroundColor: Colors.soft },
  duration: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(10,13,20,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  play: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
