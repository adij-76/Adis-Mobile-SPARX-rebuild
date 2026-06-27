import { Ionicons } from '@expo/vector-icons';
import { createElement } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { vimeoEmbedUrl, type SparkyVideo } from '@/lib/sparky';

/**
 * Full-screen modal that plays a Vimeo video.
 *
 * On web we embed the Vimeo player in an iframe. On native (no extra webview
 * dependency yet) we fall back to opening the video in the system browser /
 * Vimeo app — swap in react-native-webview here when we ship native builds.
 */
export function VideoPlayerModal({
  video,
  onClose,
}: {
  video: SparkyVideo | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const embed = video ? vimeoEmbedUrl(video.url) : null;

  const frameWidth = Math.min(width - Spacing.lg * 2, 720);
  const frameHeight = Math.min((frameWidth * 9) / 16, height * 0.6);

  return (
    <Modal
      visible={!!video}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => (e as { stopPropagation?: () => void }).stopPropagation?.()}>
          <View style={styles.headerRow}>
            <Txt variant="titleSm" color={Colors.white} style={styles.title} numberOfLines={2}>
              {video?.title ?? 'Video'}
            </Txt>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.white} />
            </Pressable>
          </View>

          <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
            {Platform.OS === 'web' && embed
              ? createElement('iframe', {
                  src: embed,
                  style: { width: '100%', height: '100%', border: 'none' },
                  allow: 'autoplay; fullscreen; picture-in-picture',
                  allowFullScreen: true,
                  title: video?.title ?? 'Vimeo video',
                } as Record<string, unknown>)
              : (
                <Pressable
                  style={styles.fallback}
                  onPress={() => video && Linking.openURL(video.url)}>
                  <Ionicons name="play-circle" size={64} color={Colors.white} />
                  <Txt variant="bodySm" color={Colors.white} style={styles.fallbackText}>
                    Tap to play
                  </Txt>
                </Pressable>
              )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: { width: '100%', alignItems: 'center', gap: Spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    maxWidth: 720,
  },
  title: { flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { marginTop: Spacing.sm },
});
