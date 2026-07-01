import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { VideoPlayerModal } from '@/components/video-player-modal';
import { ActivityIndicator } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DEMO_VIDEO_URL } from '@/data/content';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';

export default function VideoDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recommendedVideos = useAsync(() => api.content.recommendedVideos(), []).data ?? [];
  const video = recommendedVideos.find((v) => v.id === id) ?? recommendedVideos[0];

  const { isFav, toggleFav, markVideoWatched } = useStore();
  const [liked, setLiked] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Web: mark watched when the player reports the video ended (onEnded below).
  // Native: the fallback opens an external browser we can't observe, so mark it
  // watched on open instead.
  const play = () => {
    if (Platform.OS !== 'web' && video) markVideoWatched(video.id);
    setPlaying(true);
  };

  if (!video) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const more = recommendedVideos.filter((v) => v.id !== video.id);
  const playUrl = video.vimeoUrl ?? DEMO_VIDEO_URL;
  const saved = isFav('video', video.id);

  const onShare = async () => {
    const message = `${video.title} — a video from SPARx`;
    if (Platform.OS === 'web') {
      const nav = (globalThis as { navigator?: any }).navigator;
      try {
        if (nav?.share) await nav.share({ title: video.title, text: message });
        else await nav?.clipboard?.writeText(message);
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await Share.share({ message });
      } catch {
        /* user cancelled */
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Player */}
        <Pressable style={styles.player} onPress={play}>
          <Image source={{ uri: video.image }} style={styles.poster} />
          <View style={styles.playBig}>
            <Ionicons name="play" size={28} color={Colors.primaryDark} />
          </View>
          <View style={styles.controls}>
            <Ionicons name="play" size={16} color={Colors.white} />
            <Txt variant="caption" color={Colors.white}>
              {video.duration}
            </Txt>
            <View style={{ flex: 1 }} />
            <Txt variant="caption" color={Colors.white}>
              Tap to play
            </Txt>
          </View>
        </Pressable>

        <Txt variant="title">{video.title}</Txt>
        <View style={styles.meta}>
          <Txt variant="caption" color={Colors.textSub}>
            {video.presenter} · {video.views}
          </Txt>
          <View style={styles.actions}>
            <Pressable onPress={() => setLiked((l) => !l)} hitSlop={8}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? Colors.orange : Colors.primary}
              />
            </Pressable>
            <Pressable onPress={() => toggleFav('video', video.id)} hitSlop={8}>
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={Colors.primary}
              />
            </Pressable>
            <Pressable onPress={onShare} hitSlop={8}>
              <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
            </Pressable>
          </View>
        </View>
        <Txt variant="body" color={Colors.textSub}>
          {video.description}
        </Txt>

        <Txt variant="titleSm" style={{ marginTop: Spacing.sm }}>
          More like this
        </Txt>
        {more.map((v) => (
          <Pressable key={v.id} style={styles.moreRow} onPress={() => router.push(`/videos/${v.id}`)}>
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

      <VideoPlayerModal
        video={playing ? { url: playUrl, title: video.title, thumbnail: video.image } : null}
        onClose={() => setPlaying(false)}
        onEnded={() => markVideoWatched(video.id)}
      />
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
  actions: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  moreRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  moreThumb: { width: 110, height: 70, borderRadius: Radius.sm, backgroundColor: Colors.soft },
});
