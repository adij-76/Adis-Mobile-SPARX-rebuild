import { Image, type ImageStyle } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type StyleProp, type ViewStyle } from 'react-native';

import { useVimeoMeta } from '@/hooks/use-vimeo-meta';
import { gradientFor } from '@/lib/gradient';

/**
 * Video poster with a reliable fallback chain:
 *   1. an explicit image URL (seed videos, or a backfilled thumbnail_url), else
 *   2. the Vimeo oEmbed thumbnail (works for public videos), else
 *   3. a deterministic on-brand gradient — so a private video (whose thumbnail
 *      oEmbed can't read) shows a branded tile, never a blank grey box.
 *
 * Real thumbnails for private snippet/lesson videos come from the
 * `Backfill lesson thumbnails` action (table=snippets) → `thumbnail_url`.
 */
export function VideoThumbnail({
  image,
  vimeoUrl,
  seed,
  style,
}: {
  image?: string | null;
  vimeoUrl?: string | null;
  seed: string;
  style: StyleProp<ImageStyle & ViewStyle>;
}) {
  const meta = useVimeoMeta(image ? null : vimeoUrl ?? null);
  const uri = image || meta?.thumbnail || null;
  if (uri) return <Image source={{ uri }} style={style} contentFit="cover" transition={200} />;
  const [a, b] = gradientFor(seed);
  return <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style as StyleProp<ViewStyle>} />;
}
