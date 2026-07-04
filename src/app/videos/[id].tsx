import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Confetti } from '@/components/confetti';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { VideoPlayerModal } from '@/components/video-player-modal';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCurrentAuthor } from '@/lib/auth';
import { DEMO_VIDEO_URL } from '@/data/content';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';

export default function VideoDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recommendedVideos = useAsync(() => api.content.recommendedVideos(), []).data ?? [];
  // Resolve the video by id from the recommendations (keeps the title identical
  // to the home checklist/rail); if it isn't in that list, fetch the exact video
  // by id so a tap never lands on a different video. Only then fall back to [0].
  const byId = useAsync(() => (id ? api.content.videosByIds([id]) : Promise.resolve([])), [id]).data ?? [];
  const video = recommendedVideos.find((v) => v.id === id) ?? byId[0] ?? recommendedVideos[0];

  const { isFav, toggleFav, markVideoWatched, isVideoWatched, awardVideoProgress } = useStore();
  const { appUserId } = useCurrentAuthor();
  const [liked, setLiked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [earned, setEarned] = useState(0); // points banked this video

  // Advance the video's furthest-watched to `percent`: bank streak-scaled points
  // for any new tier crossed (local) and persist the percent (server, best-effort).
  const progressTo = (percent: number) => {
    if (!video) return;
    const pts = awardVideoProgress(video.id, percent);
    if (pts > 0) setEarned((e) => e + pts);
    api.content.markVideoWatched(video.id, appUserId, percent).catch(() => {});
  };

  // Finished: tick the checklist (local), bank points up to 100%, and celebrate
  // the first time it's completed (not on a re-watch).
  const complete = () => {
    if (!video) return;
    const firstTime = !isVideoWatched(video.id);
    markVideoWatched(video.id);
    progressTo(100);
    if (firstTime) setCelebrate(true);
  };

  // The player reached the end (web): record completion AND close the player so
  // the celebration — a normal overlay that would otherwise sit *behind* the
  // full-screen player Modal — is actually visible.
  const onVideoEnded = () => {
    complete();
    setPlaying(false);
  };

  // Web: starting the video banks the first point; milestones + completion are
  // reported by the player (onProgress/onEnded below). Native: the fallback opens
  // an external browser we can't observe, so count it complete on open.
  const play = () => {
    if (Platform.OS === 'web') progressTo(1);
    else complete();
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
          <VideoThumbnail image={video.image} vimeoUrl={video.vimeoUrl} seed={video.id} style={styles.poster} />
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

        {/* Reliable completion: auto-detection via the player can be flaky, so
            always offer an explicit way to tick it off (fires the reward too). */}
        {isVideoWatched(video.id) ? (
          <View style={styles.watchedChip}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Txt variant="bodySmBold" color={Colors.success}>
              Watched — nice work
            </Txt>
          </View>
        ) : (
          <Pressable style={styles.markBtn} onPress={complete}>
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
            <Txt variant="bodySmBold" color={Colors.white}>
              Mark as watched
            </Txt>
          </Pressable>
        )}

        <Txt variant="titleSm" style={{ marginTop: Spacing.sm }}>
          More like this
        </Txt>
        {more.map((v) => (
          <Pressable key={v.id} style={styles.moreRow} onPress={() => router.push(`/videos/${v.id}`)}>
            <VideoThumbnail image={v.image} vimeoUrl={v.vimeoUrl} seed={v.id} style={styles.moreThumb} />
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
        onEnded={onVideoEnded}
        onProgress={progressTo}
      />

      {celebrate && (
        <>
          <Confetti count={70} />
          <Pressable style={styles.celebrate} onPress={() => setCelebrate(false)}>
            <View style={styles.celebrateCard}>
              <Ionicons name="checkmark-circle" size={34} color={Colors.success} />
              <Txt variant="titleSm" style={{ textAlign: 'center' }}>
                Video complete!
              </Txt>
              {earned > 0 && (
                <View style={styles.pointsPill}>
                  <Ionicons name="star" size={15} color={Colors.star} />
                  <Txt variant="bodySmBold" color={Colors.primaryDark}>
                    +{earned} {earned === 1 ? 'point' : 'points'}
                  </Txt>
                </View>
              )}
              <Txt variant="bodySm" color={Colors.textSub} style={{ textAlign: 'center' }}>
                Nice work — this is checked off your program. Keep your streak up to
                earn more per video.
              </Txt>
              <View style={styles.celebrateBtn}>
                <Txt variant="bodySmBold" color={Colors.white}>
                  Keep going
                </Txt>
              </View>
            </View>
          </Pressable>
        </>
      )}
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
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  watchedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.highlight,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  moreRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  moreThumb: { width: 110, height: 70, borderRadius: Radius.sm, backgroundColor: Colors.soft },
  celebrate: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,13,20,0.45)',
    padding: Spacing.xl,
  },
  celebrateCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.soft,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  celebrateBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
});
