import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import {
  dailyChecklist,
  dailyQuote,
  heroProgram,
  recommendedVideos,
  socials,
  upcomingMeetings,
  user,
} from '@/data/content';

const TABS = ['Programs', 'Workshop', 'Challenges'] as const;

export default function HomeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Programs');
  const [checklistOpen, setChecklistOpen] = useState(true);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <Txt variant="titleSm" color={Colors.white}>
              Hello {user.name} 👋
            </Txt>
          </View>
          <View style={styles.headerIcons}>
            <HeaderIcon name="notifications-outline" />
            <HeaderIcon name="bookmark-outline" />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Install banner */}
        <View style={styles.banner}>
          <Ionicons name="download-outline" size={18} color={Colors.primaryDark} />
          <Txt variant="bodySmMedium" color={Colors.primaryDark}>
            Install IGNTD app for a better experience
          </Txt>
        </View>

        {/* Quote */}
        <LinearGradient
          colors={['#4A2B6B', '#2D2350']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quote}>
          <View style={{ flex: 1 }}>
            <Txt variant="bodySmMedium" color={Colors.white}>
              “{dailyQuote.text}”
            </Txt>
            <Txt variant="caption" color={Colors.textMutedOnDark} style={{ marginTop: Spacing.sm }}>
              - {dailyQuote.author}
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.white} />
        </LinearGradient>

        {/* Daily checklist */}
        <Card padded={false} style={styles.checklist}>
          <Pressable
            style={styles.checklistHead}
            onPress={() => setChecklistOpen((v) => !v)}>
            <Txt variant="titleSm">Daily Checklist</Txt>
            <Ionicons
              name={checklistOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textSub}
            />
          </Pressable>
          {checklistOpen &&
            dailyChecklist.map((item, i) => (
              <View
                key={item.id}
                style={[
                  styles.checkRow,
                  i === 0 && item.done && styles.checkRowDone,
                ]}>
                <Ionicons
                  name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={item.done ? Colors.success : Colors.orange}
                />
                <Txt variant="bodySm" style={{ flex: 1 }}>
                  {item.label}
                </Txt>
                {!item.done && (
                  <Ionicons name="chevron-forward" size={18} color={Colors.textSub} />
                )}
              </View>
            ))}
        </Card>

        {/* Segmented tabs */}
        <View style={styles.segment}>
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.segmentItem, active && styles.segmentItemActive]}>
                <Txt
                  variant="bodySmMedium"
                  color={active ? Colors.white : Colors.textSub}>
                  {t}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        {/* Programs */}
        <SectionHeader title="Programs" onSeeAll={() => router.push('/workshop/list')} />
        <LinearGradient
          colors={['#10243A', '#1C3B55', '#3A2A5A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.program}>
          <Txt variant="caption" color={Colors.orangePale} style={{ letterSpacing: 1 }}>
            {heroProgram.badge.toUpperCase()}
          </Txt>
          <Txt variant="title" color={Colors.white} center style={{ marginTop: Spacing.sm }}>
            {heroProgram.title}
          </Txt>
          <View style={styles.programProgress}>
            <ProgressBar progress={heroProgram.progress} />
            <Txt variant="caption" color={Colors.white} style={{ marginTop: Spacing.xs }}>
              {Math.round(heroProgram.progress * 100)}% 🔥
            </Txt>
          </View>
          <Button
            title="Continue to Lesson"
            variant="white"
            onPress={() => router.push('/workshop/intro')}
          />
        </LinearGradient>

        {/* Upcoming meetings */}
        <SectionHeader
          title="Upcoming Meetings"
          count={upcomingMeetings.length}
          onSeeAll={() => router.push('/meetings')}
        />
        {upcomingMeetings.map((m) => (
          <Pressable key={m.id} onPress={() => router.push(`/meetings/${m.id}`)}>
            <Card style={styles.meeting}>
              <View style={styles.meetingTop}>
                <Txt variant="bodySmBold" color={Colors.primary}>
                  {m.time}
                </Txt>
                {m.startsIn && (
                  <Txt variant="caption" color={Colors.orange}>
                    ● {m.startsIn}
                  </Txt>
                )}
              </View>
              <Txt variant="bodyMedium" style={{ marginTop: Spacing.sm }}>
                {m.title}
              </Txt>
              <Txt variant="caption" color={Colors.textSub} style={{ marginTop: Spacing.xs }}>
                Meeting with {m.host}
              </Txt>
            </Card>
          </Pressable>
        ))}
        <View style={styles.meetingActions}>
          <View style={{ flex: 1 }}>
            <Button title="Book a group" variant="primary" onPress={() => router.push('/meetings')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Book a session"
              variant="primary"
              onPress={() => router.push('/meetings')}
            />
          </View>
        </View>

        {/* Recommended videos */}
        <SectionHeader title="Recommended Videos" onSeeAll={() => router.push('/workshop/list')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videoRow}>
          {recommendedVideos.map((v) => (
            <View key={v.id} style={styles.videoCard}>
              <View>
                <Image source={{ uri: v.image }} style={styles.videoImage} />
                <View style={styles.videoDuration}>
                  <Txt variant="caption" color={Colors.white}>
                    {v.duration}
                  </Txt>
                </View>
                <View style={styles.playButton}>
                  <Ionicons name="play" size={18} color={Colors.primaryDark} />
                </View>
              </View>
              <Txt variant="bodySm" numberOfLines={2} style={{ marginTop: Spacing.sm }}>
                {v.title}
              </Txt>
            </View>
          ))}
        </ScrollView>

        {/* Socials */}
        <Txt variant="titleSm">Socials</Txt>
        <View style={styles.socialsRow}>
          {socials.map((s) => (
            <Pressable
              key={s.id}
              style={styles.socialBtn}
              onPress={() => Linking.openURL(s.url)}>
              <Ionicons name={s.icon} size={22} color={Colors.primary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable style={styles.headerIconBtn} hitSlop={8}>
      <Ionicons name={name} size={20} color={Colors.white} />
    </Pressable>
  );
}

function SectionHeader({
  title,
  count,
  onSeeAll,
}: {
  title: string;
  count?: number;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Txt variant="titleSm">{title}</Txt>
        {count != null && (
          <View style={styles.countBadge}>
            <Txt variant="caption" color={Colors.white}>
              {count}
            </Txt>
          </View>
        )}
      </View>
      <Pressable onPress={onSeeAll}>
        <Txt variant="bodySmMedium" color={Colors.primary}>
          See all
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  headerSafe: { backgroundColor: Colors.primaryDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.blue600 },
  headerIcons: { flexDirection: 'row', gap: Spacing.sm },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  socialsRow: { flexDirection: 'row', gap: Spacing.md },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.orangePale,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  quote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  checklist: { padding: Spacing.lg, gap: Spacing.sm },
  checklistHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  checkRowDone: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(56,199,147,0.08)',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  segmentItemActive: { backgroundColor: Colors.primaryDark },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  program: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
    ...Shadow.card,
  },
  programProgress: { alignSelf: 'stretch', alignItems: 'center' },
  meeting: { gap: 0 },
  meetingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meetingActions: { flexDirection: 'row', gap: Spacing.md },
  videoRow: { gap: Spacing.md, paddingRight: Spacing.lg },
  videoCard: { width: 220 },
  videoImage: {
    width: '100%',
    height: 130,
    borderRadius: Radius.md,
    backgroundColor: Colors.soft,
  },
  videoDuration: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    backgroundColor: 'rgba(10,13,20,0.75)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
