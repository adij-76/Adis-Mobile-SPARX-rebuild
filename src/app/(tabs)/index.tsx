import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/layout/screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import {
  challenges,
  dailyChecklist,
  dailyQuote,
  heroProgram,
  recommendedVideos,
  socials,
  upcomingMeetings,
  workshops,
  type Challenge,
  type WorkshopSummary,
} from '@/data/content';
import { isDoneToday } from '@/lib/checkin';
import { useStore } from '@/lib/store';

const TABS = ['Programs', 'Workshop', 'Challenges'] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { isFav, toggleFav } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Programs');
  const [checklistOpen, setChecklistOpen] = useState(true);

  // Auto-present the daily check-in once per day when the app opens.
  const prompted = useRef(false);
  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;
    isDoneToday().then((done) => {
      if (!done) setTimeout(() => router.push('/checkin'), 400);
    });
  }, [router]);

  return (
    <Screen style={styles.root}>
      <AppHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Install banner */}
        <Pressable style={styles.banner} onPress={() => router.push('/pwa-install')}>
          <Ionicons name="download-outline" size={18} color={Colors.primaryDark} />
          <Txt variant="bodySmMedium" color={Colors.primaryDark}>
            Install IGNTD app for a better experience
          </Txt>
        </Pressable>

        {/* Quote */}
        <Pressable onPress={() => router.push('/quotes')}>
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
        </Pressable>

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
              <Pressable
                key={item.id}
                onPress={() => router.push(item.route as never)}
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
              </Pressable>
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

        {/* Tab content — swaps inline with the segmented control above */}
        {tab === 'Programs' && (
          <>
            <SeeAllRow onPress={() => router.push('/workshop/list')} />
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
          </>
        )}

        {tab === 'Workshop' && (
          <>
            <SeeAllRow onPress={() => router.push('/workshop/list')} />
            {workshops.map((w) => (
              <WorkshopRow key={w.id} workshop={w} onPress={() => router.push('/workshop/intro')} />
            ))}
          </>
        )}

        {tab === 'Challenges' &&
          challenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}

        {/* Upcoming meetings */}
        <SectionHeader
          title="Upcoming Meetings"
          count={upcomingMeetings.length}
          onSeeAll={() => router.push('/meetings')}
        />
        <View style={styles.meetingActions}>
          <View style={{ flex: 1 }}>
            <Button
              title="Book a group"
              variant="primary"
              onPress={() => router.push('/meetings/book')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Book a session"
              variant="primary"
              onPress={() => router.push('/meetings/book?paid=1')}
            />
          </View>
        </View>
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

        {/* Recommended videos */}
        <SectionHeader title="Recommended Videos" onSeeAll={() => router.push('/videos')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videoRow}>
          {recommendedVideos.map((v) => (
            <Pressable
              key={v.id}
              style={styles.videoCard}
              onPress={() => router.push(`/videos/${v.id}`)}>
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
                <Pressable
                  style={styles.videoBookmark}
                  hitSlop={8}
                  onPress={(e) => {
                    (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
                    toggleFav('video', v.id);
                  }}>
                  <Ionicons
                    name={isFav('video', v.id) ? 'bookmark' : 'bookmark-outline'}
                    size={16}
                    color={Colors.white}
                  />
                </Pressable>
              </View>
              <Txt variant="bodySm" numberOfLines={2} style={{ marginTop: Spacing.sm }}>
                {v.title}
              </Txt>
            </Pressable>
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
    </Screen>
  );
}

function SeeAllRow({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.seeAllRow}>
      <Pressable onPress={onPress} hitSlop={8}>
        <Txt variant="bodySmMedium" color={Colors.primary}>
          See all
        </Txt>
      </Pressable>
    </View>
  );
}

function WorkshopRow({ workshop, onPress }: { workshop: WorkshopSummary; onPress: () => void }) {
  return (
    <Pressable style={styles.wRow} onPress={onPress}>
      <Image source={{ uri: workshop.image }} style={styles.wThumb} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodySmBold" numberOfLines={2}>
          {workshop.title}
        </Txt>
        <Txt variant="caption" color={Colors.textSub}>
          {workshop.author}
        </Txt>
        <View style={styles.stars}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Ionicons
              key={i}
              name={i < workshop.rating ? 'star' : 'star-outline'}
              size={12}
              color={Colors.orange}
            />
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textSub} />
    </Pressable>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.challengeHead}>
        <View style={[styles.challengeIcon, { backgroundColor: `${challenge.color}22` }]}>
          <Ionicons name={challenge.icon as never} size={20} color={challenge.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyMedium">{challenge.title}</Txt>
          <Txt variant="caption" color={Colors.textSub}>
            {challenge.days}-day challenge
          </Txt>
        </View>
      </View>
      <Txt variant="bodySm" color={Colors.textSub}>
        {challenge.description}
      </Txt>
      <ProgressBar progress={challenge.progress} track={Colors.soft} fill={challenge.color} />
      <Txt variant="caption" color={Colors.textSub}>
        {Math.round(challenge.progress * 100)}% complete
      </Txt>
    </Card>
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
  seeAllRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -Spacing.sm },
  wRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.md,
  },
  wThumb: { width: 84, height: 64, borderRadius: Radius.sm, backgroundColor: Colors.soft },
  stars: { flexDirection: 'row', gap: 1, marginTop: 2 },
  challengeHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  challengeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
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
  videoBookmark: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10,13,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
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
