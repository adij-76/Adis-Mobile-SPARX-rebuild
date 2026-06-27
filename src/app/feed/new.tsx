import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { communities } from '@/data/content';

const RULES = [
  'Be kind and supportive — everyone is on their own journey.',
  'No judgement, shaming, or unsolicited advice.',
  'Keep shared stories anonymous unless you have consent.',
  'No promotion, selling, or external links.',
];

export default function NewPost() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [community, setCommunity] = useState(communities[0].id);
  const [text, setText] = useState('');

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
      <ScreenHeader title="Back" largeTitle="Make a post" />
      <ScrollView contentContainerStyle={styles.body}>
        <Txt variant="bodySmMedium">Post to</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
          {communities.map((c) => {
            const active = c.id === community;
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
          placeholder="Share what's on your mind…"
          placeholderTextColor={Colors.textSub}
          style={styles.input}
          multiline
        />

        <View style={styles.attach}>
          <Pressable style={styles.attachBtn}>
            <Ionicons name="image-outline" size={20} color={Colors.primary} />
            <Txt variant="bodySmMedium" color={Colors.primary}>
              Add photo
            </Txt>
          </Pressable>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title="Post"
          variant="primary"
          disabled={!text.trim()}
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  body: { padding: Spacing.lg, gap: Spacing.lg },
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
  footer: { padding: Spacing.lg },
});
