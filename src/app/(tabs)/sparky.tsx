import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/layout/screen';
import { VideoPlayerModal } from '@/components/video-player-modal';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  askSparky,
  sparkyConfigured,
  type SparkyReply,
  type SparkyTurn,
  type SparkyVideo,
} from '@/lib/sparky';

type Msg = {
  id: string;
  from: 'sparky' | 'me';
  text: string;
  typing?: boolean;
  videos?: SparkyVideo[];
};

const SUGGESTIONS = [
  'I had a tough day',
  'Help me prep for my session',
  'Give me a grounding exercise',
  'Explain my Wheel of Life',
];

const WELCOME: Msg = {
  id: 'w',
  from: 'sparky',
  text: "Hey, I'm Sparky ✨ — your SPARx companion. I'm here whenever you want to talk things through, get a quick exercise, or make sense of your progress. What's on your mind?",
};

function reply(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('tough') || p.includes('hard') || p.includes('bad'))
    return "I'm really glad you told me. Tough days are part of the journey, not a step back. Want to try a 60-second grounding exercise, or just talk it out?";
  if (p.includes('ground'))
    return 'Let’s do it. Breathe in for 4, hold for 4, out for 4. Notice 5 things you can see, 4 you can hear, 3 you can touch. I’m right here.';
  if (p.includes('wheel'))
    return 'Your Wheel of Life shows Health & Family as your strongest area and Romance & Fun as the one asking for attention. Want a small, specific goal for that this week?';
  if (p.includes('session') || p.includes('prep'))
    return 'Nice — a little prep goes a long way. What would make this session a win for you? I can help you jot down 2–3 things to bring up.';
  return "I hear you. Tell me a little more, and we'll take it one step at a time together.";
}

function VideoCard({ video, onPress }: { video: SparkyVideo; onPress: () => void }) {
  return (
    <Pressable style={styles.videoCard} onPress={onPress}>
      <View style={styles.videoThumb}>
        {video.thumbnail ? (
          <Image
            source={{ uri: video.thumbnail }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#FF9D4B', '#166890']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.playBadge}>
          <Ionicons name="play" size={22} color={Colors.white} />
        </View>
      </View>
      <View style={styles.videoMeta}>
        <Ionicons name="logo-vimeo" size={16} color={Colors.primary} />
        <Txt variant="bodySm" color={Colors.textMain} numberOfLines={2} style={styles.videoTitle}>
          {video.title ?? 'Watch video'}
        </Txt>
      </View>
    </Pressable>
  );
}

export default function Sparky() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeVideo, setActiveVideo] = useState<SparkyVideo | null>(null);
  const sessionId = useRef(`s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`).current;

  const send = async (value?: string) => {
    const content = (value ?? text).trim();
    if (!content || busy) return;
    setText('');

    const history: SparkyTurn[] = messages
      .filter((m) => !m.typing)
      .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', text: m.text }));

    const typingId = `typing-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: `me-${m.length}`, from: 'me', text: content },
      { id: typingId, from: 'sparky', text: '', typing: true },
    ]);

    let answer: SparkyReply;
    if (sparkyConfigured) {
      setBusy(true);
      try {
        answer = await askSparky(content, sessionId, history, user?.appUserId ?? null);
      } catch {
        answer = {
          text: "I couldn't reach my brain just now — please check your connection and try again in a moment.",
          videos: [],
        };
      } finally {
        setBusy(false);
      }
    } else {
      // No webhook configured yet → local fallback.
      await new Promise((r) => setTimeout(r, 500));
      answer = { text: reply(content), videos: [] };
    }

    setMessages((m) =>
      m.map((msg) =>
        msg.id === typingId
          ? { ...msg, text: answer.text, videos: answer.videos, typing: false }
          : msg,
      ),
    );
  };

  return (
    <Screen style={styles.root}>
      <SafeAreaView edges={['top']}>
        <LinearGradient
          colors={['#FF9D4B', '#166890']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <View style={styles.sparkAvatar}>
            <Ionicons name="sparkles" size={22} color={Colors.white} />
          </View>
          <View>
            <Txt variant="titleSm" color={Colors.white}>
              Sparky
            </Txt>
            <Txt variant="caption" color="rgba(255,255,255,0.9)">
              Your SPARx AI companion
            </Txt>
          </View>
        </LinearGradient>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {messages.map((m) => (
            <View key={m.id} style={styles.msgGroup}>
              <View style={[styles.row, m.from === 'me' ? styles.rowMe : styles.rowSparky]}>
                {m.from === 'sparky' && (
                  <View style={styles.bubbleAvatar}>
                    <Ionicons name="sparkles" size={14} color={Colors.white} />
                  </View>
                )}
                <View
                  style={[styles.bubble, m.from === 'me' ? styles.bubbleMe : styles.bubbleSparky]}>
                  {m.typing ? (
                    <Txt variant="bodySm" color={Colors.textSub}>
                      Sparky is typing…
                    </Txt>
                  ) : (
                    <Txt variant="bodySm" color={m.from === 'me' ? Colors.white : Colors.textMain}>
                      {m.text}
                    </Txt>
                  )}
                </View>
              </View>

              {m.videos?.map((v, i) => (
                <VideoCard key={`${m.id}-v${i}`} video={v} onPress={() => setActiveVideo(v)} />
              ))}
            </View>
          ))}

          {messages.length === 1 && (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
                  <Txt variant="caption" color={Colors.primary}>
                    {s}
                  </Txt>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message Sparky…"
            placeholderTextColor={Colors.textSub}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={() => send()}
            disabled={busy}
            style={[styles.sendBtn, busy && { opacity: 0.5 }]}>
            <Ionicons name="arrow-up" size={20} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sparkAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: Spacing.lg, gap: Spacing.md },
  msgGroup: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, maxWidth: '90%' },
  rowSparky: { alignSelf: 'flex-start' },
  rowMe: { alignSelf: 'flex-end' },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flexShrink: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bubbleSparky: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderBottomLeftRadius: 4,
  },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  videoCard: {
    alignSelf: 'flex-start',
    marginLeft: 36,
    width: 248,
    maxWidth: '86%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  videoThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  videoTitle: { flex: 1 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.stroke,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: Colors.screen,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textMain,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
