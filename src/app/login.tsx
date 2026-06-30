import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password);
      // The auth gate redirects to the app once status flips to authed.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}>
          <View style={styles.card}>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <Ionicons name="sparkles" size={24} color={Colors.white} />
              </View>
              <Txt variant="titleLg">SPARx</Txt>
            </View>

            <Txt variant="title" center>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Txt>
            <Txt variant="bodySm" color={Colors.textSub} center style={{ marginBottom: Spacing.sm }}>
              {mode === 'signin'
                ? 'Sign in to pick up your journey.'
                : 'Sign up with your email to get started.'}
            </Txt>

            <View style={styles.field}>
              <Ionicons name="mail-outline" size={18} color={Colors.textSub} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={Colors.textSub}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                style={styles.input}
                onSubmitEditing={submit}
              />
            </View>

            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textSub} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={Colors.textSub}
                secureTextEntry={!show}
                autoCapitalize="none"
                textContentType="password"
                style={styles.input}
                onSubmitEditing={submit}
              />
              <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textSub} />
              </Pressable>
            </View>

            {error ? (
              <View style={styles.error}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Txt variant="caption" color={Colors.danger} style={{ flex: 1 }}>
                  {error}
                </Txt>
              </View>
            ) : null}

            <Button
              title={mode === 'signin' ? 'Sign in' : 'Create account'}
              variant="primary"
              loading={busy}
              onPress={submit}
            />

            <Pressable
              onPress={() => {
                setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                setError(null);
              }}
              hitSlop={8}
              style={styles.toggle}>
              <Txt variant="caption" color={Colors.textSub}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Txt variant="caption" color={Colors.primary}>
                  {mode === 'signin' ? 'Create one' : 'Sign in'}
                </Txt>
              </Txt>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  logo: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.screen,
  },
  input: { flex: 1, paddingVertical: Spacing.md, color: Colors.textMain, fontSize: 15 },
  error: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  toggle: { alignItems: 'center', paddingVertical: Spacing.xs },
});
