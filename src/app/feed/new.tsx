import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/confetti';
import { RankMovement } from '@/components/ui/rank-movement';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { api } from '@/api';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useCurrentAuthor } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useXpAward, type XpMovement } from '@/lib/xp-award';

// Sample images used by "Add photo" until a real image picker is wired in.
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=70',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=70',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=70',
];

const RULES = [
  'Be kind and supportive — everyone is on their own journey.',
  'No judgement, shaming, or unsolicited advice.',
  'Keep shared stories anonymous unless you have consent.',
  'No promotion, selling, or external links.',
];

export default function NewPost() {
  const router = useRouter();
  const { addPost, awardCommunityXp, awardBonus } = useStore();
  const award = useXpAward();
  const author = useCurrentAuthor();
  const { text: prefill, channel, intro } = useLocalSearchParams<{
    text?: string;
    channel?: string;
    intro?: string;
  }>();
  // Coming from onboarding's "introduce yourself" → skip the rules gate and, on
  // post, award the one-time +50 activation bonus.
  const isIntro = intro === '1';
  // Coming from a shared quote or the intro flow → skip the rules gate.
  const [agreed, setAgreed] = useState(!!prefill || isIntro);
  const communities = useAsync(() => api.community.communities(), []).data ?? [];
  // Preselect the channel when composing from inside a room.
  const [community, setCommunity] = useState<string | null>(channel ?? null);
  const selectedCommunity = community ?? communities[0]?.id ?? null;
  const [text, setText] = useState(prefill ?? '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<{ earned: number; movement: XpMovement | null } | null>(
    null,
  );

  // Intro flow came in via replace() (no back stack) — send them to their
  // community feed to SEE the post they just made and stay in the activation
  // loop; otherwise return to the room they composed from.
  const leave = () => {
    if (isIntro) router.replace('/(tabs)/community');
    else router.back();
  };

  const submit = async () => {
    if (busy) return;
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    // Persist FIRST and wait for it. The room reads server data and refetches on
    // focus, so if we navigated before the write landed the post could be missing
    // until a manual refresh — the friction the user hit. Awaiting guarantees the
    // row exists before we return to the feed.
    try {
      await api.posts.createPost({
        channelId: selectedCommunity,
        text: body,
        image: photo ?? null,
        appUserId: author.appUserId,
      });
    } catch {
      setBusy(false);
      setError("Couldn't post — check your connection and try again.");
      return;
    }
    // Reflect locally (instant in the store-backed feed) + award XP now that the
    // post is real.
    const name = communities.find((c) => c.id === selectedCommunity)?.name ?? 'Community';
    addPost({ community: name, text: body, image: photo ?? undefined, author });
    const earned = awardCommunityXp('community_post') + (isIntro ? awardBonus(50) : 0);
    setBusy(false);
    // Celebrate the post the same way lessons / check-ins do — +XP and the
    // leaderboard movement — then leave when they tap Continue.
    if (earned > 0) {
      setCelebrate({ earned, movement: null });
      award({ source: isIntro ? 'intro' : 'community_post', points: earned }).then((m) =>
        setCelebrate((c) => (c ? { ...c, movement: m } : c)),
      );
    } else {
      leave();
    }
  };

  if (celebrate) {
    return <PostCelebration earned={celebrate.earned} movement={celebrate.movement} intro={isIntro} onDone={leave} />;
  }

  const addPhoto = () => {
    // Placeholder for a real picker/file input: cycle sample → sample → off.
    if (!photo) setPhoto(SAMPLE_PHOTOS[0]);
    else {
      const next = SAMPLE_PHOTOS[SAMPLE_PHOTOS.indexOf(photo) + 1];
      setPhoto(next ?? null);
    }
  };

  if (!agreed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Back" largeTitle="Community rules" />
        <ScrollView contentContainerStyle={styles.body}>
          <Txt variant="body" color={Colors.textSub}>
            This is a safe space. Please read and agree to our community guidelines before posting.
          </Txt>
          {RULES.map((r, i) => (
            <View key={i} style={styles.rule}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Txt variant="bodySm" style={{ flex: 1 }}>
                {r}
              </Txt>
            </View>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Button title="I agree, continue" variant="primary" onPress={() => setAgreed(true)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle={isIntro ? 'Introduce yourself' : 'Make a post'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {isIntro && (
          <View style={styles.introBanner}>
            <Ionicons name="sparkles" size={18} color={Colors.orange} />
            <Txt variant="bodySm" color={Colors.textMain} style={{ flex: 1 }}>
              Share a little about yourself and what brought you here — post to earn{' '}
              <Txt variant="bodySmBold" color={Colors.orange}>
                +50 XP
              </Txt>
              .
            </Txt>
          </View>
        )}
        <Txt variant="bodySmMedium">Post to</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
          {communities.map((c) => {
            const active = c.id === selectedCommunity;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCommunity(c.id)}
                style={[styles.chip, active && styles.chipActive]}>
                <Txt variant="caption" color={active ? Colors.white : Colors.textSub}>
                  {c.name}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={
            isIntro
              ? "Hi everyone! I'm new here. A bit about me and what I'm working on…"
              : "Share what's on your mind…"
          }
          placeholderTextColor={Colors.textSub}
          style={styles.input}
          multiline
        />

        {photo ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <Pressable style={styles.photoRemove} onPress={() => setPhoto(null)} hitSlop={8}>
              <Ionicons name="close" size={16} color={Colors.white} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.attach}>
          <Pressable style={styles.attachBtn} onPress={addPhoto}>
            <Ionicons name="image-outline" size={20} color={Colors.primary} />
            <Txt variant="bodySmMedium" color={Colors.primary}>
              {photo ? 'Change photo' : 'Add photo'}
            </Txt>
          </Pressable>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {error && (
          <Txt variant="bodySm" color={Colors.danger} style={{ marginBottom: Spacing.sm }}>
            {error}
          </Txt>
        )}
        <Button
          title={busy ? 'Posting…' : 'Post'}
          variant="primary"
          disabled={!text.trim() || busy}
          onPress={submit}
        />
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Reward screen after posting to the community — mirrors the lesson / check-in
 *  celebration so sharing always feels rewarding (+XP and leaderboard movement). */
function PostCelebration({
  earned,
  movement,
  intro,
  onDone,
}: {
  earned: number;
  movement: XpMovement | null;
  intro: boolean;
  onDone: () => void;
}) {
  return (
    <View style={styles.ackRoot}>
      <Confetti />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.ackCenter}>
          <View style={styles.ackStar}>
            <Ionicons name="chatbubbles" size={48} color={Colors.primaryDarker} />
          </View>
          <Txt variant="display" color={Colors.white} center style={{ marginTop: Spacing.xl }}>
            {intro ? "You're in! 🎉" : 'Posted! 🎉'}
          </Txt>
          <Txt variant="body" color={Colors.textMutedOnDark} center style={{ marginTop: Spacing.sm }}>
            {intro
              ? 'Introducing yourself is a big first step. Your community is glad you’re here.'
              : 'Thanks for sharing — showing up for others is how the community grows.'}
          </Txt>
          <View style={styles.ackReward}>
            <Txt variant="display" color={Colors.orange}>
              +{earned}
            </Txt>
            <Txt variant="caption" color={Colors.textMutedOnDark}>
              XP earned
            </Txt>
          </View>
          <View style={{ marginTop: Spacing.lg }}>
            <RankMovement movement={movement} />
          </View>
          <View style={styles.ackButtonWrap}>
            <Button title="Continue" variant="white" onPress={onDone} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  introBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.highlight,
    borderWidth: 1,
    borderColor: Colors.highlightBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  rule: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  input: {
    minHeight: 160,
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    color: Colors.textMain,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  attach: { flexDirection: 'row' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  photoWrap: { position: 'relative' },
  photo: { width: '100%', height: 180, borderRadius: Radius.md, backgroundColor: Colors.soft },
  photoRemove: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { padding: Spacing.lg },
  // Post celebration (mirrors the lesson/check-in reward screen)
  ackRoot: { flex: 1, backgroundColor: Colors.primaryDarker },
  ackCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  ackStar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackReward: { alignItems: 'center', marginTop: Spacing.xl },
  ackButtonWrap: { position: 'absolute', left: Spacing.xl, right: Spacing.xl, bottom: Spacing.xl },
});
