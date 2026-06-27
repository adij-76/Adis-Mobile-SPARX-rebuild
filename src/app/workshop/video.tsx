import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { WorkshopScaffold } from '@/components/workshop-scaffold';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { workshop } from '@/data/content';

export default function WorkshopVideo() {
  return (
    <WorkshopScaffold current={1} prev="/workshop/intro" next="/workshop/worksheet">
      {/* Mock video player */}
      <View style={{ borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#000' }}>
        <Image source={{ uri: workshop.videoPoster }} style={{ width: '100%', height: 200 }} />
        <View style={{ position: 'absolute', top: Spacing.md, right: Spacing.md }}>
          <Ionicons name="heart-outline" size={22} color={Colors.white} />
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
          <Ionicons name="volume-high" size={18} color={Colors.white} />
          <Ionicons name="settings-outline" size={18} color={Colors.white} />
          <Ionicons name="scan" size={18} color={Colors.white} />
        </View>
      </View>

      <Txt variant="title">{workshop.title}</Txt>
      <Txt variant="body" color={Colors.textSub}>
        {workshop.videoBody}
      </Txt>
    </WorkshopScaffold>
  );
}
