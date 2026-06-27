import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { WorkshopScaffold } from '@/components/workshop-scaffold';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Txt } from '@/components/ui/text';
import { VideoPlayerModal } from '@/components/video-player-modal';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DEMO_VIDEO_URL, workshop } from '@/data/content';

export default function WorkshopVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <WorkshopScaffold current={1} prev="/workshop/intro" next="/workshop/worksheet">
      <Pressable
        style={{ borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#000' }}
        onPress={() => setPlaying(true)}>
        <Image source={{ uri: workshop.videoPoster }} style={{ width: '100%', height: 200 }} />
        <View style={styles.playBig}>
          <Ionicons name="play" size={26} color={Colors.primaryDark} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            backgroundColor: '#0A0D14',
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
          }}>
          <Ionicons name="play" size={18} color={Colors.white} />
          <Txt variant="caption" color={Colors.white}>
            0:00
          </Txt>
          <View style={{ flex: 1 }}>
            <ProgressBar progress={0.02} track="rgba(255,255,255,0.3)" fill={Colors.white} />
          </View>
          <Txt variant="caption" color={Colors.white}>
            Tap to play
          </Txt>
        </View>
      </Pressable>

      <Txt variant="title">{workshop.title}</Txt>
      <Txt variant="body" color={Colors.textSub}>
        {workshop.videoBody}
      </Txt>

      <VideoPlayerModal
        video={playing ? { url: DEMO_VIDEO_URL, title: workshop.title } : null}
        onClose={() => setPlaying(false)}
      />
    </WorkshopScaffold>
  );
}

const styles = {
  playBig: {
    position: 'absolute' as const,
    top: 70,
    left: '50%' as const,
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
