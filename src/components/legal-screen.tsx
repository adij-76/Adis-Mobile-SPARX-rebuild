import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

export type LegalSection = { heading: string; body: string };

export function LegalScreen({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle={title} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Txt variant="caption" color={Colors.textSub}>
          Last updated {updated}
        </Txt>
        {sections.map((s, i) => (
          <View key={i} style={{ gap: Spacing.sm }}>
            <Txt variant="titleSm">{s.heading}</Txt>
            <Txt variant="body" color={Colors.textSub}>
              {s.body}
            </Txt>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.lg },
});
