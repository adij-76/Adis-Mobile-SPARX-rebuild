import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import type { AdminActiveTester, AdminOverview } from '@/api';

/**
 * Hidden admin backend — reachable only by navigating to `/admin` (no tab, no
 * link). The data is gated server-side: `mobile_admin_overview()` raises
 * "not authorized" unless the caller's email is on the `mobile_admins`
 * allowlist, so a curious non-admin who finds the URL still sees nothing.
 *
 * This is the "who's actually using the app as we test" view — real activity
 * (onboarding + check-ins + XP + assessments + posts), not the one-time
 * auth-import batch that floods raw signup timestamps.
 */
export default function AdminScreen() {
  const { data, loading, error } = useAsync<AdminOverview>(() => api.admin.overview(30), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Admin" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.xxl }}>
            Loading…
          </Txt>
        ) : error ? (
          <NotAuthorized />
        ) : data ? (
          <Overview data={data} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotAuthorized() {
  return (
    <View style={styles.center}>
      <Ionicons name="lock-closed" size={40} color={Colors.textSub} />
      <Txt variant="titleSm" color={Colors.textMain} center style={{ marginTop: Spacing.md }}>
        Not authorized
      </Txt>
      <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.xs }}>
        This account isn’t on the admin allowlist.
      </Txt>
    </View>
  );
}

function Overview({ data }: { data: AdminOverview }) {
  const t = data.totals;
  return (
    <>
      <Txt variant="bodySm" color={Colors.textSub} style={{ marginBottom: Spacing.md }}>
        Signed in as {data.generated_for} · last {data.window_days} days
      </Txt>

      <View style={styles.tileRow}>
        <Stat label="Auth users" value={t.auth_users} icon="people" />
        <Stat label="Prod users" value={t.prod_users} icon="server" />
      </View>
      <View style={styles.tileRow}>
        <Stat label="Mobile-first" value={t.mobile_first} icon="phone-portrait" tint={Colors.primary} />
        <Stat label="Onboarded" value={t.onboarded} icon="checkmark-circle" tint={Colors.success} />
      </View>
      <View style={styles.tileRow}>
        <Stat label="Active testers" value={t.active_testers} icon="pulse" tint="#F0453B" />
        <View style={styles.tileSpacer} />
      </View>

      <Section title={`Active testers (${data.active_testers.length})`}>
        {data.active_testers.length === 0 ? (
          <Txt variant="bodySm" color={Colors.textSub}>
            No app activity yet — the DB has users, but nobody has checked in, posted, or taken an
            assessment.
          </Txt>
        ) : (
          data.active_testers.map((r) => <TesterRow key={r.email} r={r} />)
        )}
      </Section>

      <Section title="Signups per day">
        {data.signups_by_day.length === 0 ? (
          <Txt variant="bodySm" color={Colors.textSub}>
            No signups in the window.
          </Txt>
        ) : (
          data.signups_by_day.map((d) => (
            <View key={d.day} style={styles.dayRow}>
              <Txt variant="bodySm" color={Colors.textMain}>
                {d.day}
              </Txt>
              <Txt variant="bodySmBold" color={Colors.textMain}>
                {d.count}
              </Txt>
            </View>
          ))
        )}
        <Txt variant="caption" color={Colors.textSub} style={{ marginTop: Spacing.sm }}>
          Note: the one-time legacy import lands all on a single day — the “Active testers” list
          above is the real adoption signal.
        </Txt>
      </Section>
    </>
  );
}

function TesterRow({ r }: { r: AdminActiveTester }) {
  return (
    <View style={styles.testerRow}>
      <View style={{ flex: 1 }}>
        <Txt variant="bodySmMedium" color={Colors.textMain} numberOfLines={1}>
          {r.email}
        </Txt>
        <View style={styles.metaRow}>
          <Chip label={r.is_existing ? 'existing' : 'new'} tone={r.is_existing ? 'sub' : 'primary'} />
          {r.onboarded_at ? <Chip label="onboarded" tone="success" /> : null}
        </View>
      </View>
      <View style={styles.counts}>
        <Count n={r.xp_total} unit="XP" />
        <Count n={r.checkins} unit="chk" />
        <Count n={r.assessments} unit="asmt" />
        <Count n={r.posts} unit="post" />
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  icon,
  tint = Colors.textMain,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint?: string;
}) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={18} color={tint} />
      <Txt variant="titleLg" color={Colors.textMain} style={{ marginTop: Spacing.xs }}>
        {value}
      </Txt>
      <Txt variant="caption" color={Colors.textSub}>
        {label}
      </Txt>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Txt variant="bodySmBold" color={Colors.textMain} style={{ marginBottom: Spacing.md }}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

function Chip({ label, tone }: { label: string; tone: 'sub' | 'primary' | 'success' }) {
  const bg = tone === 'primary' ? '#E7F1F6' : tone === 'success' ? '#E4F7EF' : Colors.soft;
  const fg = tone === 'primary' ? Colors.primary : tone === 'success' ? Colors.success : Colors.textSub;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Txt variant="caption" color={fg}>
        {label}
      </Txt>
    </View>
  );
}

function Count({ n, unit }: { n: number; unit: string }) {
  return (
    <View style={styles.count}>
      <Txt variant="bodySmBold" color={n > 0 ? Colors.textMain : Colors.textSub}>
        {n}
      </Txt>
      <Txt variant="caption" color={Colors.textSub}>
        {unit}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  center: { alignItems: 'center', marginTop: Spacing.xxl * 2 },
  tileRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  tile: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.lg,
  },
  tileSpacer: { flex: 1 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  testerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.soft,
    gap: Spacing.md,
  },
  metaRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  counts: { flexDirection: 'row', gap: Spacing.md },
  count: { alignItems: 'center', minWidth: 34 },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.soft,
  },
});
