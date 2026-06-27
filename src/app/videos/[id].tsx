import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { recommendedVideos } from '@/data/content';

export default function VideoDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const video = recommendedVideos.find((v) => v.id === id) ?? recommendedVideos[0];
  const more = recommendedVideos.filter((v) => v.id !== video.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Player */}
        <View style={styles.player}>
          <Image source={{ uri: video.image }} style={styles.poster} />
          <View style={styles.playBig}>
            <Ionicons name="play" size={28} color={Colors.primaryDark} />
          </View>
          <View style={styles.controls}>
            <Ionicons name="play" size={16} color={Colors.white} />
            <Txt variant="caption" color={Colors.white}>
              0:00 / {video.duration}
            </Txt>
            <View style={{ flex: 1 }} />
            <Ionicons name="volume-high" size={16} color={Colors.white} />
            <Ionicons name="expand" size={16} color={Colors.white} />
          </View>
        </View>

        <Txt variant="title">{video.title}</Txt>
        <View style={styles.meta}>
          <Txt variant="caption" color={Colors.textSub}>
            {video.presenter} · {video.views}
          </Txt>
          <View style={styles.actions}>
            <Ionicons name="heart-outline" size={20} color={Colors.primary} />
            <Ionicons name="bookmark-outline" size={20} color={Colors.primary} />
            <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
          </View>
        </View>
        <Txt variant="body" color={Colors.textSub}>
          {video.description}
        </Txt>

        <Txt variant="titleSm" style={{ marginTop: Spacing.sm }}>
          More like this
        </Txt>
        {more.map((v) => (
          <Pressable
            key={v.id}
            style={styles.moreRow}
            onPress={() => router.push(`/videos/${v.id}`)}>
            <Image source={{ uri: v.image }} style={styles.moreThumb} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodySmBold" numberOfLines={2}>
                {v.title}
              </Txt>
              <Txt variant="caption" color={Colors.textSub}>
                {v.presenter}
              </Txt>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  body: { padding: Spacing.lg, gap: Spacing.md },
  player: { borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#000' },
  poster: { width: '100%', height: 210 },
  playBig: {
    position: 'absolute',
    top: '42%',
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(10,13,20,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: Spacing.md },
  moreRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  moreThumb: { width: 110, height: 70, borderRadius: Radius.sm, backgroundColor: Colors.soft },
});
