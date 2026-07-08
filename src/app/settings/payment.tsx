import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ComingSoon } from '@/components/coming-soon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { BILLING_ENABLED } from '@/constants/flags';

// Real saved cards come from the payment processor once billing is live; until
// then there are none (no fabricated cards — audit F-M5).
const CARDS: { id: string; brand: string; last4: string; exp: string; primary?: boolean }[] = [];

export default function PaymentMethods() {
  const router = useRouter();
  if (!BILLING_ENABLED) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Back" largeTitle="Payment methods" />
        <ComingSoon
          icon="card-outline"
          title="Payments are coming soon"
          message="Manage your payment methods here once billing is live. You have no cards on file and nothing is charged today."
        />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Payment methods" />
      <ScrollView contentContainerStyle={styles.body}>
        {CARDS.map((c) => (
          <Card key={c.id} style={styles.card}>
            <View style={styles.brand}>
              <Ionicons name="card" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyMedium">
                {c.brand} •••• {c.last4}
              </Txt>
              <Txt variant="caption" color={Colors.textSub}>
                Expires {c.exp}
              </Txt>
            </View>
            {c.primary && (
              <View style={styles.pill}>
                <Txt variant="caption" color={Colors.white}>
                  Default
                </Txt>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title="Add new card"
          variant="primary"
          iconLeft="add"
          onPress={() => router.push('/settings/add-card')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  brand: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(22,104,144,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.pill },
  footer: { padding: Spacing.lg },
});
