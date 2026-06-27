import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

const CARDS = [
  { id: 'visa', brand: 'Visa', last4: '4242', exp: '08/27', primary: true },
  { id: 'mc', brand: 'Mastercard', last4: '5512', exp: '11/26' },
];

export default function PaymentMethods() {
  const router = useRouter();
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
