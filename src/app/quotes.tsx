import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/text';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { quoteBackgrounds, quotes, type Quote } from '@/data/content';

const { width, height } = Dimensions.get('window');

export default function QuotesScreen() {
  const router = useRouter();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const startIndex = Math.min(Math.max(0, Number(start) || 0), quotes.length - 1);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const shareSocial = async (q: Quote) => {
    try {
      await Share.share({ message: `“${q.text}”\n\n— ${q.author}\n\nvia IGNTD` });
    } catch {
      /* user dismissed */
    }
  };

  const shareCommunity = (q: Quote) => {
    router.push(`/feed/new?text=${encodeURIComponent(`“${q.text}” — ${q.author}`)}`);
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={quotes}
        keyExtractor={(q) => q.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index }) => {
          const bg = quoteBackgrounds[index % quoteBackgrounds.length];
          const isSaved = saved[item.id];
          return (
            <View style={styles.page}>
              <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={['rgba(10,13,20,0.25)', 'rgba(10,13,20,0.45)', 'rgba(10,13,20,0.85)']}
                style={StyleSheet.absoluteFill}
              />

              <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
                {/* top bar */}
                <View style={styles.topBar}>
                  <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconCircle}>
                    <Ionicons name="close" size={22} color={Colors.white} />
                  </Pressable>
                  <Txt variant="caption" color="rgba(255,255,255,0.8)">
                    {index + 1} / {quotes.length}
                  </Txt>
                </View>

                {/* quote */}
                <View style={styles.quoteWrap}>
                  <Ionicons name="chatbox" size={28} color="rgba(255,255,255,0.5)" />
                  <Txt style={styles.quoteText}>{item.text}</Txt>
                  <Txt style={styles.author}>— {item.author}</Txt>
                </View>

                {/* actions */}
                <View style={styles.actions}>
                  <Action
                    icon={isSaved ? 'heart' : 'heart-outline'}
                    label="Save"
                    onPress={() => setSaved((s) => ({ ...s, [item.id]: !s[item.id] }))}
                  />
                  <Action icon="share-social-outline" label="Share" onPress={() => shareSocial(item)} />
                  <Action icon="people-outline" label="Community" onPress={() => shareCommunity(item)} />
                </View>

                <Txt variant="caption" color="rgba(255,255,255,0.7)" center style={{ marginTop: Spacing.md }}>
                  Swipe for more · IGNTD
                </Txt>
              </SafeAreaView>
            </View>
          );
        }}
      />
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <View style={styles.actionCircle}>
        <Ionicons name={icon} size={22} color={Colors.white} />
      </View>
      <Txt variant="caption" color={Colors.white}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDarker },
  page: { width, height },
  overlay: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteWrap: { flex: 1, justifyContent: 'center', gap: Spacing.lg },
  quoteText: {
    fontFamily: FontFamily.bold,
    fontSize: 30,
    lineHeight: 42,
    color: Colors.white,
  },
  author: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
  },
  action: { alignItems: 'center', gap: Spacing.xs },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
