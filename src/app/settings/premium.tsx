import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

const BENEFITS = [
  'Every workshop and lesson, unlocked',
  'Unlimited 1:1 coaching sessions',
  'Personalised weekly reports',
  'Priority community support',
  'Ad-free, distraction-free experience',
];

const PLANS = [
  { key: 'monthly', label: 'Monthly', price: '$19', per: '/mo' },
  { key: 'annual', label: 'Annual', price: '$149', per: '/yr', tag: 'Save 35%' },
];

export default function Premium() {
  const router = useRouter();
  const [plan, setPlan] = useState('annual');
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader title="Back" />
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#FF9D4B', '#FFB879']} style={styles.hero}>
            <Ionicons name="diamond" size={40} color={Colors.white} />
            <Txt variant="titleLg" color={Colors.white} center>
              SPARx Premium
            </Txt>
            <Txt variant="bodySm" color="rgba(255,255,255,0.9)" center>
              Everything you need for your recovery journey, in one place.
            </Txt>
          </LinearGradient>

          <View style={{ gap: Spacing.md }}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefit}>
                <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                <Txt variant="bodyMedium" style={{ flex: 1 }}>
                  {b}
                </Txt>
              </View>
            ))}
          </View>

          <View style={styles.plans}>
            {PLANS.map((p) => {
              const active = p.key === plan;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPlan(p.key)}
                  style={[styles.plan, active && styles.planActive]}>
                  {p.tag && (
                    <View style={styles.tag}>
                      <Txt variant="caption" color={Colors.white}>
                        {p.tag}
                      </Txt>
                    </View>
                  )}
                  <Txt variant="bodySmMedium" color={Colors.textSub}>
                    {p.label}
                  </Txt>
                  <Txt variant="titleLg" color={active ? Colors.primary : Colors.textMain}>
                    {p.price}
                    <Txt variant="bodySm" color={Colors.textSub}>
                      {p.per}
                    </Txt>
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title="Start 7-day free trial"
            variant="primary"
            onPress={() => router.push('/settings/payment')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  body: { padding: Spacing.lg, gap: Spacing.xl },
  hero: { borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  plans: { flexDirection: 'row', gap: Spacing.md },
  plan: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  planActive: { borderColor: Colors.primary, backgroundColor: 'rgba(22,104,144,0.06)' },
  tag: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.orange,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  footer: { padding: Spacing.lg },
});
