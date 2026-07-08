import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

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
  const { user } = useAuth();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = cur.length > 0 && next.length >= 8 && next === confirm;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Re-verifies the current password, then updates it via GoTrue.
      await api.auth.changePassword(user?.email ?? '', cur, next);
    } catch (e) {
      setBusy(false);
      setError(
        e instanceof Error && /invalid|credential|password/i.test(e.message)
          ? 'Your current password is incorrect.'
          : e instanceof Error
            ? e.message
            : "Couldn't update your password.",
      );
      return;
    }
    setCur('');
    setNext('');
    setConfirm('');
    setBusy(false);
    setDone(true);
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Back" largeTitle="Change password" />
        <View style={styles.success}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={Colors.white} />
          </View>
          <Txt variant="title" center>
            Password updated
          </Txt>
          <Txt variant="bodySm" color={Colors.textSub} center>
            Your password has been changed. Use it next time you sign in.
          </Txt>
        </View>
        <View style={styles.footer}>
          <Button title="Done" variant="primary" onPress={() => setDone(false)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Change password" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field label="Current password" value={cur} onChange={setCur} />
          <Field label="New password" value={next} onChange={setNext} />
          <Field label="Confirm new password" value={confirm} onChange={setConfirm} />
          <Txt variant="caption" color={Colors.textSub}>
            Use at least 8 characters with a mix of letters and numbers.
          </Txt>
          {error ? (
            <Txt variant="bodySm" color={Colors.danger}>
              {error}
            </Txt>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title={busy ? 'Updating…' : 'Update password'}
            variant="primary"
            disabled={!valid || busy}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
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
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});
