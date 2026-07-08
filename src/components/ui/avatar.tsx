import { Image, type ImageStyle } from 'expo-image';
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors } from '@/constants/theme';

const PALETTE = ['#166890', '#38C793', '#FF9D4B', '#7A5AF8', '#E5739B', '#5B8DEF', '#F7C948', '#C77DFF'];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/**
 * User avatar with a graceful fallback: shows the image when it's a real http(s)
 * URL that loads, otherwise a deterministic coloured circle with the person's
 * initial. Avoids broken-image grey boxes and random stock faces for users
 * whose avatar_link is null/relative/expired.
 */
export function Avatar({
  uri,
  name,
  size = 40,
  style,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size, borderRadius: size / 2 };
  const valid = !!uri && /^https?:\/\//i.test(uri) && !failed;

  if (valid) {
    return (
      <Image
        source={{ uri: uri as string }}
        style={[dim, style] as StyleProp<ImageStyle>}
        contentFit="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[dim, { backgroundColor: colorFor(name || '?'), alignItems: 'center', justifyContent: 'center' }, style]}>
      <Txt variant="bodySmBold" color={Colors.white} style={{ fontSize: Math.round(size * 0.38) }}>
        {initials(name)}
      </Txt>
    </View>
  );
}

/** Up to two initials from a name: "Ada Lovelace" → "AL", "Maya" → "M". Shown
 *  only when there's no uploaded avatar image. */
function initials(name?: string | null): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
