import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { VideoPlayerModal } from '@/components/video-player-modal';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { fetchVimeoMeta, type SparkyVideo } from '@/lib/sparky';
import type { Snippet } from '@/api/types';

function formatLength(sec: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const hasRealDescription = (d: string | null) => !!d && !/no description/i.test(d);

/** A snippet row, enriched on mount with its real Vimeo title + thumbnail. */
function SnippetCard({ snippet, onPlay }: { snippet: Snippet; onPlay: (v: SparkyVideo) => void }) {
  const [meta, setMeta] = useState<{ title?: string; thumbnail?: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (snippet.vimeoUrl) fetchVimeoMeta(snippet.vimeoUrl).then((m) => active && setMeta(m));
    return () => {
      active = false;
    };
  }, [snippet.vimeoUrl]);

  const dur = formatLength(snippet.lengthSeconds);
  const title =
    meta?.title ??
    (hasRealDescription(snippet.description) ? snippet.description : 'Untitled video');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      disabled={!snippet.vimeoUrl}
      onPress={() => snippet.vimeoUrl && onPlay({ url: snippet.vimeoUrl, title })}>
      <View style={styles.thumb}>
        {meta?.thumbnail && (
          <Image source={{ uri: meta.thumbnail }} style={styles.thumbImg} contentFit="cover" />
        )}
        <View style={styles.play}>
          <Ionicons name="play" size={18} color={Colors.primaryDark} />
        </View>
        {dur && (
          <View style={styles.duration}>
            <Txt variant="caption" color={Colors.white}>
              {dur}
            </Txt>
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodySmBold" numberOfLines={3}>
          {title}
        </Txt>
        {snippet.aiGenerated && (
          <Txt variant="caption" color={Colors.textSub}>
            ✨ AI-generated
          </Txt>
        )}
      </View>
    </Pressable>
  );
}

export default function VideosList() {
  const { data, loading, error, reload } = useAsync(() => api.content.snippets(), []);
  const [playing, setPlaying] = useState<SparkyVideo | null>(null);
  const snippets = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Recommended Videos" />

      <View style={styles.sourceRow}>
        <View style={[styles.dot, { backgroundColor: api.backend === 'supabase' ? Colors.success : Colors.textSub }]} />
        <Txt variant="caption" color={Colors.textSub}>
          {api.backend === 'supabase' ? 'Live · Supabase' : 'Sample data'}
        </Txt>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.strokeStrong} />
          <Txt variant="bodySm" color={Colors.textSub} center>
            Couldn&apos;t load videos.{'\n'}
            {error.message}
          </Txt>
          <Button title="Try again" variant="outline" onPress={reload} />
        </View>
      ) : snippets.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="film-outline" size={40} color={Colors.strokeStrong} />
          <Txt variant="bodySm" color={Colors.textSub} center>
            No videos available yet.
          </Txt>
        </View>
      ) : (
        <FlatList
          data={snippets}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <SnippetCard snippet={item} onPlay={setPlaying} />}
        />
      )}

      <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  list: { padding: Spacing.lg, gap: Spacing.lg },
  card: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  thumb: {
    width: 130,
    height: 84,
    borderRadius: Radius.md,
    backgroundColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
