import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { reports } from '@/data/content';

export default function Reports() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Personalised reports" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {reports.map((r) => (
          <Card key={r.id} style={{ gap: Spacing.sm }}>
            <View style={styles.head}>
              <View style={styles.icon}>
                <Ionicons name="document-text" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMedium">{r.title}</Txt>
                <Txt variant="caption" color={Colors.textSub}>
                  {r.date}
                </Txt>
              </View>
            </View>
            <Txt variant="bodySm" color={Colors.textSub}>
              {r.summary}
            </Txt>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22,104,144,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
