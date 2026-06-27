import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Msg = { id: string; from: 'sparky' | 'me'; text: string };

const SUGGESTIONS = [
  'I had a tough day',
  'Help me prep for my session',
  'Give me a grounding exercise',
  'Explain my Wheel of Life',
];

const WELCOME: Msg = {
  id: 'w',
  from: 'sparky',
  text: "Hey, I'm Sparky ✨ — your IGNTD companion. I'm here whenever you want to talk things through, get a quick exercise, or make sense of your progress. What's on your mind?",
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

export default function Sparky() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [text, setText] = useState('');

  const send = (value?: string) => {
    const content = (value ?? text).trim();
    if (!content) return;
    setMessages((m) => [
      ...m,
      { id: `me-${m.length}`, from: 'me', text: content },
      { id: `sp-${m.length}`, from: 'sparky', text: reply(content) },
    ]);
    setText('');
  };

  return (
    <View style={styles.root}>
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
              Your IGNTD AI companion
            </Txt>
          </View>
        </LinearGradient>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {messages.map((m) => (
            <View
              key={m.id}
              style={[styles.row, m.from === 'me' ? styles.rowMe : styles.rowSparky]}>
              {m.from === 'sparky' && (
                <View style={styles.bubbleAvatar}>
                  <Ionicons name="sparkles" size={14} color={Colors.white} />
                </View>
              )}
              <View style={[styles.bubble, m.from === 'me' ? styles.bubbleMe : styles.bubbleSparky]}>
                <Txt variant="bodySm" color={m.from === 'me' ? Colors.white : Colors.textMain}>
                  {m.text}
                </Txt>
              </View>
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
          <Pressable onPress={() => send()} style={styles.sendBtn}>
            <Ionicons name="arrow-up" size={20} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
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
  bubble: { borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  bubbleSparky: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.stroke, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
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
