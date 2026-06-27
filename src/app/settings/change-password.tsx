import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
}) {
  return (
    <View style={{ gap: Spacing.sm }}>
      <Txt variant="bodySmMedium">{label}</Txt>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor={Colors.textSub}
        style={styles.input}
      />
    </View>
  );
}

export default function ChangePassword() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const valid = next.length >= 8 && next === confirm;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Change password" />
      <ScrollView contentContainerStyle={styles.body}>
        <Field label="Current password" value={cur} onChange={setCur} />
        <Field label="New password" value={next} onChange={setNext} />
        <Field label="Confirm new password" value={confirm} onChange={setConfirm} />
        <Txt variant="caption" color={Colors.textSub}>
          Use at least 8 characters with a mix of letters and numbers.
        </Txt>
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Update password" variant="primary" disabled={!valid} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  body: { padding: Spacing.lg, gap: Spacing.lg },
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
