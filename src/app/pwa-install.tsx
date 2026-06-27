import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Segmented } from '@/components/ui/segmented';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type OS = 'ios' | 'android';

const STEPS: Record<OS, { icon: keyof typeof Ionicons.glyphMap; text: string }[]> = {
  ios: [
    { icon: 'share-outline', text: 'Open this app in Safari, then tap the Share button at the bottom.' },
    { icon: 'add-circle-outline', text: 'Scroll down and tap “Add to Home Screen”.' },
    { icon: 'checkmark-circle-outline', text: 'Tap “Add”. The IGNTD icon will appear on your home screen.' },
  ],
  android: [
    { icon: 'ellipsis-vertical', text: 'Open this app in Chrome, then tap the ⋮ menu.' },
    { icon: 'add-circle-outline', text: 'Tap “Install app” or “Add to Home screen”.' },
    { icon: 'checkmark-circle-outline', text: 'Confirm. IGNTD installs like a native app.' },
  ],
};

export default function PwaInstall() {
  const [os, setOs] = useState<OS>('ios');
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Install the app" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.appIcon}>
            <Txt variant="titleLg" color={Colors.white}>
              IG
            </Txt>
          </View>
          <Txt variant="body" color={Colors.textSub} center>
            Install IGNTD to your home screen for faster access, offline support and a full-screen
            experience.
          </Txt>
        </View>

        <Segmented<OS>
          options={[
            { key: 'ios', label: 'iPhone' },
            { key: 'android', label: 'Android' },
          ]}
          value={os}
          onChange={setOs}
        />

        <View style={{ gap: Spacing.md }}>
          {STEPS[os].map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.num}>
                <Txt variant="bodySmBold" color={Colors.white}>
                  {i + 1}
                </Txt>
              </View>
              <Ionicons name={s.icon} size={22} color={Colors.primary} />
              <Txt variant="bodySm" style={{ flex: 1 }}>
                {s.text}
              </Txt>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.xl },
  hero: { alignItems: 'center', gap: Spacing.md },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  num: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
