import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

const FAQS = [
  {
    q: 'What is the IGNTD Hero Program?',
    a: 'It is our flagship guided program that combines workshops, daily check-ins, and coaching to help you build a healthier relationship with yourself and others.',
  },
  {
    q: 'How do daily check-ins work?',
    a: 'Each day you answer a short set of questions about your mood, cravings, sleep and connection. Over time this builds a personalised picture of your progress.',
  },
  {
    q: 'Can I book 1:1 sessions?',
    a: 'Yes. From the Home screen tap “Book a session” to schedule time with a coach. Premium members get unlimited sessions.',
  },
  {
    q: 'Is my data private?',
    a: 'Absolutely. Your check-ins and reports are private to you. Community posts are only shared with the communities you choose.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Profile → Payment methods, or manage it directly through your app store subscription settings.',
  },
];

export default function FAQs() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="FAQs" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <Pressable
              key={i}
              onPress={() => setOpen(isOpen ? null : i)}
              style={styles.item}>
              <View style={styles.qRow}>
                <Txt variant="bodyMedium" style={{ flex: 1 }}>
                  {f.q}
                </Txt>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.textSub}
                />
              </View>
              {isOpen && (
                <Txt variant="bodySm" color={Colors.textSub} style={{ marginTop: Spacing.sm }}>
                  {f.a}
                </Txt>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.md },
  item: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  qRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
