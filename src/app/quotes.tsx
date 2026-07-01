import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Txt } from '@/components/ui/text';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useGoBack } from '@/hooks/use-go-back';
import { backgroundIndexFor, recommendQuote } from '@/lib/quote-pick';
import { useStore } from '@/lib/store';

// Bundled backgrounds (from the design) — guaranteed to load, no network.
const LOCAL_BACKGROUNDS = [
  require('../../assets/images/quote-bg/bg-1.png'),
  require('../../assets/images/quote-bg/bg-2.png'),
  require('../../assets/images/quote-bg/bg-3.png'),
  require('../../assets/images/quote-bg/bg-4.png'),
];

export default function QuoteCardScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const shotRef = useRef<View>(null);
  const { checkins } = useStore();

  // Recommend a quote from the user's most recent check-in, and pick a
  // matching background so different quotes get different scenery.
  const quotes = useAsync(() => api.content.quotes(), []).data ?? [];
  const quote = recommendQuote(quotes, checkins[0]);
  const bg = LOCAL_BACKGROUNDS[quote ? backgroundIndexFor(quote.id, LOCAL_BACKGROUNDS.length) : 0];

  const quoteText = quote ? `“${quote.text}” — ${quote.author}` : '';

  // Native capture is loaded lazily so web never evaluates native-only modules.
  const captureNative = async (): Promise<string | null> => {
    try {
      const { captureRef } = require('react-native-view-shot');
      return await captureRef(shotRef, { format: 'png', quality: 1 });
    } catch {
      return null;
    }
  };

  const onShare = async () => {
    if (Platform.OS === 'web') {
      try {
        const g = globalThis as { navigator?: any; alert?: (m: string) => void };
        if (g.navigator?.share) await g.navigator.share({ text: `${quoteText}\n\nvia SPARx` });
        else if (g.navigator?.clipboard) {
          await g.navigator.clipboard.writeText(quoteText);
          g.alert?.('Quote copied to clipboard');
        }
      } catch {
        /* dismissed */
      }
      return;
    }
    const uri = await captureNative();
    try {
      const Sharing = require('expo-sharing');
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share quote' });
        return;
      }
    } catch {
      /* fall through to text share */
    }
    await Share.share({ message: `${quoteText}\n\nvia SPARx` });
  };

  const onDownload = async () => {
    if (Platform.OS === 'web') {
      (globalThis as { alert?: (m: string) => void }).alert?.(
        'Saving the card to your photos is available in the SPARx app.'
      );
      return;
    }
    const uri = await captureNative();
    if (!uri) {
      Alert.alert('Could not save', 'Something went wrong creating the image.');
      return;
    }
    try {
      const MediaLibrary = require('expo-media-library');
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo access to save the card.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'The quote card was saved to your photos.');
    } catch {
      Alert.alert('Could not save', 'Something went wrong saving the image.');
    }
  };

  const onCommunity = () => {
    router.push(`/feed/new?text=${encodeURIComponent(quoteText)}`);
  };

  if (!quote) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.white} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Captured card: background + quote only (no chrome) */}
      <View ref={shotRef} collapsable={false} style={StyleSheet.absoluteFill}>
        {/* On-brand gradient base — shows through if the photo is slow/unavailable */}
        <LinearGradient colors={['#4A2B6B', '#2D2350', '#0A3653']} style={StyleSheet.absoluteFill} />
        <Image source={bg} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient
          colors={['rgba(10,13,20,0.15)', 'rgba(10,13,20,0.3)', 'rgba(10,13,20,0.6)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.quoteWrap}>
          <Txt style={styles.quoteText}>&ldquo;{quote.text}&rdquo;</Txt>
          <Txt style={styles.author}>- {quote.author}</Txt>
        </View>
        <Txt style={styles.watermark}>SPARx</Txt>
      </View>

      {/* Chrome overlay (not captured) */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <Pressable onPress={goBack} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
          <Txt variant="bodyMedium" color={Colors.white}>
            Back
          </Txt>
        </Pressable>

        <View style={styles.actions}>
          <Action icon="people-outline" onPress={onCommunity} />
          <Action icon="download-outline" onPress={onDownload} />
          <Action icon="share-social-outline" onPress={onShare} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function Action({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={16} style={styles.actionBtn}>
      <Ionicons name={icon} size={26} color={Colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDarker },
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: Spacing.xl },
  back: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.sm },
  quoteWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: Spacing.xl,
    right: Spacing.xl,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  quoteText: {
    fontFamily: FontFamily.semibold,
    fontSize: 27,
    lineHeight: 40,
    color: Colors.white,
    textAlign: 'center',
  },
  author: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    color: Colors.white,
    textAlign: 'center',
  },
  watermark: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.6)',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  actionBtn: { padding: Spacing.sm },
});
