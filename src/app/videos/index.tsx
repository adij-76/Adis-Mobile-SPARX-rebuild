import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { VideoPlayerModal } from '@/components/video-player-modal';
import { AsyncBoundary } from '@/components/ui/async-boundary';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SourceBadge } from '@/components/ui/source-badge';
import { Txt } from '@/components/ui/text';
import { VideoThumb } from '@/components/ui/video-thumb';
import { Colors, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { formatLength, hasRealDescription } from '@/lib/content-format';
import type { SparkyVideo } from '@/lib/sparky';
import type { Snippet } from '@/api/types';

/** A snippet row. The title comes from the DB; Vimeo only supplies the thumbnail. */
function SnippetCard({ snippet, onPlay }: { snippet: Snippet; onPlay: (v: SparkyVideo) => void }) {
  const dur = formatLength(snippet.lengthSeconds);
  const description = hasRealDescription(snippet.description) ? snippet.description : null;
  const title = hasRealDescription(snippet.title) ? (snippet.title as string) : 'Untitled video';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      disabled={!snippet.vimeoUrl}
      onPress={() => snippet.vimeoUrl && onPlay({ url: snippet.vimeoUrl, title })}>
      <VideoThumb url={snippet.vimeoUrl} duration={dur} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodySmBold" numberOfLines={2}>
          {title}
        </Txt>
        {description ? (
          <Txt variant="caption" color={Colors.textSub} numberOfLines={2}>
            {description}
          </Txt>
        ) : snippet.aiGenerated ? (
          <Txt variant="caption" color={Colors.textSub}>
            ✨ AI-generated
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function VideosList() {
  const query = useAsync(() => api.content.snippets(), []);
  const [playing, setPlaying] = useState<SparkyVideo | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Recommended Videos" />

      <SourceBadge style={styles.sourceRow} />

      <AsyncBoundary
        query={query}
        errorLabel="videos"
        empty={{ icon: 'film-outline', text: 'No videos available yet.' }}>
        {(snippets) => (
          <FlatList
            data={snippets}
            keyExtractor={(v) => v.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <SnippetCard snippet={item} onPlay={setPlaying} />}
          />
        )}
      </AsyncBoundary>

      <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  sourceRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  list: { padding: Spacing.lg, gap: Spacing.lg },
  card: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
});
