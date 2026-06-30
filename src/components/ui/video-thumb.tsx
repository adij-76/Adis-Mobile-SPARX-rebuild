import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius } from '@/constants/theme';
import { useVimeoMeta } from '@/hooks/use-vimeo-meta';

/**
 * Vimeo thumbnail + centered play badge, with an optional duration pill.
 * Resolves the thumbnail from the Vimeo URL on-device (oEmbed). Used by the
 * snippet list, module lesson rows, and anywhere a small video tile is needed.
 */
export function VideoThumb({
  url,
  width = 130,
  height = 84,
  duration,
  style,
}: {
  url: string | null;
  width?: number;
  height?: number;
  duration?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const meta = useVimeoMeta(url);
  const playSize = Math.min(34, Math.round(height * 0.42));
  return (
    <View style={[styles.thumb, { width, height }, style]}>
      {meta?.thumbnail && (
        <Image source={{ uri: meta.thumbnail }} style={styles.img} contentFit="cover" />
      )}
      <View style={[styles.play, { width: playSize, height: playSize, borderRadius: playSize / 2 }]}>
        <Ionicons name="play" size={Math.round(playSize * 0.55)} color={Colors.primaryDark} />
      </View>
      {duration ? (
        <View style={styles.duration}>
          <Txt variant="caption" color={Colors.white}>
            {duration}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    borderRadius: Radius.md,
    backgroundColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  play: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  duration: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(10,13,20,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
});
