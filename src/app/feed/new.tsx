import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { communities } from '@/data/content';
import { useStore } from '@/lib/store';

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
  const { addPost } = useStore();
  const { text: prefill } = useLocalSearchParams<{ text?: string }>();
  // Coming from a shared quote → skip the rules gate and prefill the text.
  const [agreed, setAgreed] = useState(!!prefill);
  const [community, setCommunity] = useState(communities[0].id);
  const [text, setText] = useState(prefill ?? '');
  const [photo, setPhoto] = useState<string | null>(null);

  const submit = () => {
    const name = communities.find((c) => c.id === community)?.name ?? 'Community';
    addPost({ community: name, text: text.trim(), image: photo ?? undefined });
    router.back();
  };

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
        <Button title="Post" variant="primary" disabled={!text.trim()} onPress={submit} />
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
});
