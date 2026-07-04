import { Ionicons } from '@expo/vector-icons';
import { createElement, useEffect, useRef } from 'react';
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
import { attachVimeo } from '@/lib/vimeo-attach';

/** Only allow opening https Vimeo URLs externally. Sparky replies can carry
 *  arbitrary text, so an unvalidated openURL could launch any scheme/host on
 *  native (tel:, an attacker's site, etc.); restrict to https vimeo.com. */
function safeVimeoUrl(url?: string): string | null {
  return url && /^https:\/\/([a-z0-9-]+\.)*vimeo\.com\//i.test(url) ? url : null;
}

/**
 * Full-screen modal that plays a Vimeo video.
 *
 * On web we embed the Vimeo player in an iframe and drive it with the official
 * @vimeo/player SDK to detect completion reliably — `onEnded` fires at the end
 * (or ≥95% watched), and `onProgress` at 25/50/75% milestones. The SDK is loaded
 * lazily and only on web (dynamic import behind a Platform guard), so it never
 * enters the native bundle. If it fails to load, the "Mark as watched" button on
 * the video screen is the fallback. On native we open the system browser.
 */
export function VideoPlayerModal({
  video,
  onClose,
  onEnded,
  onProgress,
}: {
  video: SparkyVideo | null;
  onClose: () => void;
  /** Fired once when the video reaches the end (web only). */
  onEnded?: () => void;
  /** Fired as the video is watched, at the 25/50/75% milestones, with the
   *  furthest percent reached so far (0-100). Web only. */
  onProgress?: (percent: number) => void;
}) {
  const { width, height } = useWindowDimensions();
  const embed = video ? vimeoEmbedUrl(video.url) : null;

  // Holds the real DOM <iframe> on web so @vimeo/player can attach to it.
  const iframeRef = useRef<any>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  // Attach the official Vimeo Player SDK (web only; native no-op) to detect
  // completion + progress. If it can't attach, the "Mark as watched" button on
  // the video screen is the fallback.
  useEffect(() => {
    if (Platform.OS !== 'web' || !embed) return;
    const el = iframeRef.current;
    if (!el) return;
    return attachVimeo(el, {
      onEnded: () => onEndedRef.current?.(),
      onProgress: (pct) => onProgressRef.current?.(pct),
    });
  }, [embed]);

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
                  ref: iframeRef,
                  src: embed,
                  style: { width: '100%', height: '100%', border: 'none' },
                  allow: 'autoplay; fullscreen; picture-in-picture',
                  allowFullScreen: true,
                  title: video?.title ?? 'Vimeo video',
                } as Record<string, unknown>)
              : (
                <Pressable
                  style={styles.fallback}
                  onPress={() => {
                    const safe = safeVimeoUrl(video?.url);
                    if (safe) Linking.openURL(safe);
                  }}>
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
