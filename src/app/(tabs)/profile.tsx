import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { user } from '@/data/content';
import { useStore } from '@/lib/store';

const STATS: { label: string; value: string; route: string }[] = [
  { label: 'Workshops', value: '12', route: '/workshop/list' },
  { label: 'Day streak', value: '6', route: '/checkin' },
  { label: 'Points', value: '1,480', route: '/mydata/leaderboard' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { clearAll } = useStore();
  const [confirm, setConfirm] = useState<null | 'logout' | 'delete'>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  const pickImage = () => {
    if (Platform.OS === 'web') {
      const doc = (globalThis as { document?: any }).document;
      const input = doc?.createElement?.('input');
      if (!input) return;
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) setAvatar(URL.createObjectURL(file));
      };
      input.click();
    }
    // native: wire expo-image-picker when we ship native builds
  };

  const resetLocal = async () => {
    clearAll();
    try {
      await AsyncStorage.removeItem('igntd.checkin.v1');
    } catch {
      /* best effort */
    }
    setConfirm(null);
    router.replace('/');
  };

  return (
    <View style={styles.root}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Image source={{ uri: avatar ?? user.avatar }} style={styles.avatar} />
          <Txt variant="title">{user.name} Joseph</Txt>
          <Txt variant="bodySm" color={Colors.textSub}>
            okeijoseph@igntd.com
          </Txt>
          <Pressable style={styles.editBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={16} color={Colors.white} />
            <Txt variant="bodySmMedium" color={Colors.white}>
              Change Image
            </Txt>
          </Pressable>
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

        <Pressable onPress={() => router.push('/settings/premium')}>
          <View style={styles.premium}>
            <Ionicons name="diamond" size={24} color={Colors.white} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodySmBold" color={Colors.white}>
                Get IGNTD Premium
              </Txt>
              <Txt variant="caption" color="rgba(255,255,255,0.85)">
                Unlock every workshop, report and 1:1 session
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </View>
        </Pressable>

        <Txt variant="caption" color={Colors.textSub} style={styles.group}>
          ACCOUNT
        </Txt>
        <Card padded={false} style={styles.list}>
          <ListRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/settings/notifications')} />
          <ListRow icon="color-palette-outline" label="Theme" value="Light" onPress={() => router.push('/settings/theme')} />
          <ListRow icon="language-outline" label="Language" value="English" onPress={() => router.push('/settings/languages')} />
          <ListRow icon="lock-closed-outline" label="Change password" onPress={() => router.push('/settings/change-password')} />
          <ListRow icon="card-outline" label="Payment method" onPress={() => router.push('/settings/payment')} divider={false} />
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

        <Card padded={false} style={styles.list}>
          <ListRow icon="log-out-outline" label="Log out" danger showChevron={false} onPress={() => setConfirm('logout')} />
          <ListRow icon="trash-outline" label="Delete account" danger showChevron={false} onPress={() => setConfirm('delete')} divider={false} />
        </Card>

        <Txt variant="caption" color={Colors.textSub} center>
          IGNTD · v1.0.0
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
                onPress={resetLocal}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  profileCard: { alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.sm, gap: Spacing.xs },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: Spacing.sm, backgroundColor: Colors.soft, borderWidth: 3, borderColor: Colors.stroke },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill, backgroundColor: Colors.primary },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  stats: { flexDirection: 'row', paddingVertical: Spacing.lg },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderRightWidth: 1, borderRightColor: Colors.stroke },
  premium: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.orange, borderRadius: Radius.lg, padding: Spacing.lg },
  group: { marginTop: Spacing.md, marginLeft: Spacing.xs, letterSpacing: 1 },
  list: { overflow: 'hidden' },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.md },
  sheetActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
