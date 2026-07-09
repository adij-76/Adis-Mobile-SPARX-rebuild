import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { api } from '@/api';
import { useAsync } from '@/hooks/use-async';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/layout/screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { StreakBadges } from '@/components/streak-badges';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { user } from '@/data/content';
import { useAuth } from '@/lib/auth';
import { computeStreak } from '@/lib/checkin';
import { useStore } from '@/lib/store';



export default function ProfileScreen() {
  const router = useRouter();
  const { clearAll, checkins, completedLessonIds, xp, claimAvatarReward } = useStore();
  const { user: authUser, signOut, updateAvatar, updateName } = useAuth();
  const [confirm, setConfirm] = useState<null | 'logout' | 'delete'>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarNote, setAvatarNote] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  // Admin allowlist is enforced server-side; this just decides whether to show
  // the hidden entry point (the /admin screen re-checks and denies non-admins).
  const { data: isAdmin } = useAsync(() => api.admin.isAdmin(), [authUser?.email]);

  const displayName = authUser?.name?.trim() || authUser?.email?.split('@')[0] || 'there';
  const avatarUri = authUser?.avatarUrl ?? user.avatar;

  const isPremium = authUser?.subscribed || authUser?.stripeActive || false;
  // Days count: prefer the server-side sobriety counter, fall back to local streak.
  const daysCount = authUser?.daysCount ?? computeStreak(checkins.map((c) => c.date));

  const STATS: { label: string; value: string; route: string }[] = [
    { label: 'Lessons done', value: String(completedLessonIds.length), route: '/lessons' },
    { label: 'Day streak',   value: String(computeStreak(checkins.map((c) => c.date))), route: '/checkin' },
    { label: 'XP', value: String(xp), route: '/videos' },
    { label: 'Days count',   value: daysCount != null ? String(daysCount) : '—', route: '/checkin' },
  ];

  const pickImage = () => {
    if (Platform.OS === 'web') {
      const doc = (globalThis as { document?: any }).document;
      const input = doc?.createElement?.('input');
      if (!input) return;
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : null;
          if (!dataUrl) return;
          setUploading(true);
          setAvatarError(null);
          try {
            await updateAvatar(dataUrl);
            // Reward finishing your profile with a photo — once.
            const earned = claimAvatarReward();
            setAvatarNote(earned > 0 ? `Nice photo! +${earned} XP for completing your profile 🎉` : null);
          } catch (e) {
            // Surface the reason instead of silently doing nothing — the usual
            // cause is the `avatars` storage bucket/policies not existing yet.
            setAvatarError(
              (e as Error)?.message?.includes('404') || (e as Error)?.message?.includes('Bucket')
                ? "Upload failed — the 'avatars' storage bucket isn't set up yet."
                : (e as Error)?.message || 'Upload failed. Please try again.',
            );
          } finally {
            setUploading(false);
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
    // native: wire expo-image-picker when we ship native builds
  };

  const onConfirm = async () => {
    if (confirm === 'delete') {
      // Real server-side deletion of the caller's app-owned data + a queued
      // request to complete auth/legacy removal (best-effort; local wipe + sign
      // out still happen so the user isn't stuck if the request fails).
      await api.auth.deleteAccount().catch(() => {});
      clearAll();
      try {
        await AsyncStorage.removeItem('igntd.checkin.v1');
      } catch {
        /* best effort */
      }
    }
    setConfirm(null);
    // Both log out and delete end the session → the auth gate routes to login.
    await signOut();
  };

  return (
    <Screen style={styles.root}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <Pressable
            style={styles.nameRow}
            onPress={() => setEditingName(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit your name">
            <Txt variant="title">{displayName}</Txt>
            <Ionicons name="pencil" size={15} color={Colors.textSub} />
          </Pressable>
          {authUser?.userHandle ? (
            <Txt variant="bodySm" color={Colors.primary}>@{authUser.userHandle}</Txt>
          ) : null}
          <Txt variant="bodySm" color={Colors.textSub}>
            {authUser?.email ?? ''}
          </Txt>
          <Pressable style={styles.editBtn} onPress={pickImage} disabled={uploading}>
            <Ionicons name="image-outline" size={16} color={Colors.white} />
            <Txt variant="bodySmMedium" color={Colors.white}>
              {uploading ? 'Uploading…' : 'Change Image'}
            </Txt>
          </Pressable>
          {avatarError ? (
            <Txt variant="caption" color={Colors.danger} center style={{ marginTop: Spacing.xs, paddingHorizontal: Spacing.lg }}>
              {avatarError}
            </Txt>
          ) : avatarNote ? (
            <Txt variant="caption" color={Colors.success} center style={{ marginTop: Spacing.xs, paddingHorizontal: Spacing.lg }}>
              {avatarNote}
            </Txt>
          ) : null}
        </View>

        <Card style={styles.stats}>
          {STATS.map((s, i) => (
            <Pressable
              key={s.label}
              onPress={() => router.push(s.route as never)}
              style={[styles.stat, i < STATS.length - 1 && styles.statDivider]}>
              <Txt variant="titleLg" color={Colors.primary}>
                {s.value}
              </Txt>
              <Txt variant="caption" color={Colors.textSub}>
                {s.label}
              </Txt>
            </Pressable>
          ))}
        </Card>

        <StreakBadges />

        <Pressable onPress={() => router.push('/settings/premium')}>
          <View style={[styles.premium, isPremium && styles.premiumActive]}>
            <Ionicons name="diamond" size={24} color={Colors.white} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodySmBold" color={Colors.white}>
                {isPremium ? 'SPARx Premium — Active' : 'Get SPARx Premium'}
              </Txt>
              <Txt variant="caption" color="rgba(255,255,255,0.85)">
                {isPremium
                  ? authUser?.advancedCoaching ? 'Advanced coaching included' : 'All workshops and reports unlocked'
                  : 'Unlock every workshop, report and 1:1 session'}
              </Txt>
            </View>
            <Ionicons name={isPremium ? 'checkmark-circle' : 'chevron-forward'} size={20} color={Colors.white} />
          </View>
        </Pressable>

        <Txt variant="caption" color={Colors.textSub} style={styles.group}>
          ACCOUNT
        </Txt>
        <Card padded={false} style={styles.list}>
          <ListRow icon="people-outline" label="Connections" onPress={() => router.push('/connections')} />
          <ListRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/settings/notifications')} />
          <ListRow icon="color-palette-outline" label="Theme" value="Light" onPress={() => router.push('/settings/theme')} />
          <ListRow icon="language-outline" label="Language" value="English" onPress={() => router.push('/settings/languages')} />
          <ListRow icon="lock-closed-outline" label="Change password" onPress={() => router.push('/settings/change-password')} />
          <ListRow icon="ban-outline" label="Blocked accounts" onPress={() => router.push('/settings/blocked')} />
          <ListRow
            icon="card-outline"
            label="Payment method"
            onPress={() => router.push('/settings/payment')}
            divider={Platform.OS === 'web'}
          />
          {Platform.OS === 'web' ? (
            <ListRow
              icon="download-outline"
              label="Install the app"
              onPress={() => router.push('/pwa-install')}
              divider={false}
            />
          ) : null}
        </Card>

        <Txt variant="caption" color={Colors.textSub} style={styles.group}>
          SUPPORT & LEGAL
        </Txt>
        <Card padded={false} style={styles.list}>
          <ListRow icon="help-circle-outline" label="FAQs" onPress={() => router.push('/settings/faqs')} />
          <ListRow icon="document-text-outline" label="Full assessment summary" onPress={() => router.push('/settings/assessment-summary')} />
          <ListRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => router.push('/settings/privacy')} />
          <ListRow icon="reader-outline" label="Terms & Conditions" onPress={() => router.push('/settings/terms')} divider={false} />
        </Card>

        {isAdmin ? (
          <Card padded={false} style={styles.list}>
            <ListRow
              icon="shield-half-outline"
              label="Admin dashboard"
              onPress={() => router.push('/admin')}
              divider={false}
            />
          </Card>
        ) : null}

        <Card padded={false} style={styles.list}>
          <ListRow icon="log-out-outline" label="Log out" danger showChevron={false} onPress={() => setConfirm('logout')} />
          <ListRow icon="trash-outline" label="Delete account" danger showChevron={false} onPress={() => setConfirm('delete')} divider={false} />
        </Card>

        <Txt variant="caption" color={Colors.textSub} center>
          SPARx · v1.0.0
        </Txt>
      </ScrollView>

      <Modal visible={confirm !== null} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirm(null)} />
        <View style={styles.sheet}>
          <Txt variant="title">
            {confirm === 'delete' ? 'Delete your account?' : 'Log out?'}
          </Txt>
          <Txt variant="bodySm" color={Colors.textSub}>
            {confirm === 'delete'
              ? 'This permanently removes your data and progress. This cannot be undone.'
              : 'You can sign back in anytime to pick up where you left off.'}
          </Txt>
          <View style={styles.sheetActions}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="outline" onPress={() => setConfirm(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={confirm === 'delete' ? 'Delete' : 'Log out'}
                variant="primary"
                onPress={onConfirm}
              />
            </View>
          </View>
        </View>
      </Modal>

      {editingName && (
        <NameEditor
          currentName={authUser?.name ?? ''}
          nameUpdatedAt={authUser?.nameUpdatedAt ?? null}
          onClose={() => setEditingName(false)}
          onSaveInstant={async (full) => {
            await updateName(full, { stampChange: true });
            setEditingName(false);
          }}
          onSubmitRequest={(full) => api.auth.requestNameChange(full)}
        />
      )}
    </Screen>
  );
}

/**
 * Name editor. The FIRST correction (before any change has been stamped) is
 * self-service and instant — so signup typos are easy to fix. After that, a
 * change becomes a correction REQUEST an admin reviews (keeps the community
 * recognisable and lets a human catch impersonation / inappropriate names).
 */
function NameEditor({
  currentName,
  nameUpdatedAt,
  onClose,
  onSaveInstant,
  onSubmitRequest,
}: {
  currentName: string;
  nameUpdatedAt: string | null;
  onClose: () => void;
  onSaveInstant: (fullName: string) => Promise<void>;
  onSubmitRequest: (fullName: string) => Promise<void>;
}) {
  const parts = currentName.trim().split(/\s+/).filter(Boolean);
  const [first, setFirst] = useState(parts[0] ?? '');
  const [last, setLast] = useState(parts.slice(1).join(' '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // A pending review request (if any) already in flight for this member.
  const [pending, setPending] = useState<string | null | undefined>(undefined);

  // The free first correction is available until a change has been stamped.
  const freeChange = !nameUpdatedAt;

  useEffect(() => {
    if (freeChange) {
      setPending(null);
      return;
    }
    let alive = true;
    api.auth
      .pendingNameChange()
      .then((p) => alive && setPending(p))
      .catch(() => alive && setPending(null));
    return () => {
      alive = false;
    };
  }, [freeChange]);

  const full = [first.trim(), last.trim()].filter(Boolean).join(' ');
  const changed = !!full && full !== currentName.trim();
  const locked = !!pending || submitted; // a request is already awaiting review

  const submit = async () => {
    if (!changed || locked || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (freeChange) {
        await onSaveInstant(full);
      } else {
        await onSubmitRequest(full);
        setSubmitted(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Txt variant="title">Your name</Txt>

        {submitted ? (
          <Txt variant="bodySm" color={Colors.success}>
            Thanks — your name change was submitted for review. We’ll update it once approved.
          </Txt>
        ) : pending ? (
          <Txt variant="bodySm" color={Colors.textSub}>
            You already have a name change (“{pending}”) awaiting review. We’ll update it once approved.
          </Txt>
        ) : freeChange ? (
          <Txt variant="bodySm" color={Colors.textSub}>
            This is how you appear across the community. You can set it once here — later changes go
            through a quick review.
          </Txt>
        ) : (
          <Txt variant="bodySm" color={Colors.textSub}>
            To keep the community recognisable, name changes are reviewed. Submit your correction and
            we’ll update it once approved.
          </Txt>
        )}

        {!submitted && !pending && (
          <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
            <TextInput
              value={first}
              onChangeText={setFirst}
              placeholder="First name"
              placeholderTextColor={Colors.textSub}
              autoCapitalize="words"
              style={styles.nameInput}
            />
            <TextInput
              value={last}
              onChangeText={setLast}
              placeholder="Last name (optional)"
              placeholderTextColor={Colors.textSub}
              autoCapitalize="words"
              style={styles.nameInput}
            />
          </View>
        )}

        {error ? (
          <Txt variant="caption" color={Colors.danger}>
            {error}
          </Txt>
        ) : null}

        <View style={styles.sheetActions}>
          <View style={{ flex: 1 }}>
            <Button title={submitted || pending ? 'Close' : 'Cancel'} variant="outline" onPress={onClose} />
          </View>
          {!submitted && !pending && (
            <View style={{ flex: 1 }}>
              <Button
                title={freeChange ? 'Save' : 'Submit for review'}
                variant="primary"
                disabled={!changed || busy || pending === undefined}
                loading={busy}
                onPress={submit}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  profileCard: { alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.sm, gap: Spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameInput: {
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textMain,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: Spacing.sm, backgroundColor: Colors.soft, borderWidth: 3, borderColor: Colors.stroke },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill, backgroundColor: Colors.primary },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  stats: { flexDirection: 'row', paddingVertical: Spacing.lg },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderRightWidth: 1, borderRightColor: Colors.stroke },
  premium: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.orange, borderRadius: Radius.lg, padding: Spacing.lg },
  premiumActive: { backgroundColor: Colors.primary },
  group: { marginTop: Spacing.md, marginLeft: Spacing.xs, letterSpacing: 1 },
  list: { overflow: 'hidden' },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.md },
  sheetActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
