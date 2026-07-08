import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/coming-soon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { BILLING_ENABLED } from '@/constants/flags';

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  flex,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  keyboardType?: 'number-pad';
  flex?: number;
}) {
  return (
    <View style={{ gap: Spacing.sm, flex }}>
      <Txt variant="bodySmMedium">{label}</Txt>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSub}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

export default function AddCard() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const valid = name && number.length >= 12 && exp && cvc.length >= 3;

  // Never collect card numbers into a dead form: until a real payment processor
  // is wired, show a coming-soon panel instead of the card fields (audit F-M5).
  if (!BILLING_ENABLED) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Back" largeTitle="Add card" />
        <ComingSoon
          icon="card-outline"
          title="Payments are coming soon"
          message="You'll be able to add a payment method here once billing is live. Nothing is charged today."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Add card" />
      <ScrollView contentContainerStyle={styles.body}>
        <Field label="Name on card" value={name} onChange={setName} placeholder="Okei Joseph" />
        <Field
          label="Card number"
          value={number}
          onChange={setNumber}
          placeholder="1234 5678 9012 3456"
          keyboardType="number-pad"
        />
        <View style={styles.rowFields}>
          <Field label="Expiry" value={exp} onChange={setExp} placeholder="MM/YY" flex={1} />
          <Field label="CVC" value={cvc} onChange={setCvc} placeholder="123" keyboardType="number-pad" flex={1} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Save card" variant="primary" disabled={!valid} onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  rowFields: { flexDirection: 'row', gap: Spacing.md },
  input: {
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textMain,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  footer: { padding: Spacing.lg },
});
