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

/** Only allow opening https Vimeo URLs externally. Sparky replies can carry
 *  arbitrary text, so an unvalidated openURL could launch any scheme/host on
 *  native (tel:, an attacker's site, etc.); restrict to https vimeo.com. */
function safeVimeoUrl(url?: string): string | null {
  return url && /^https:\/\/([a-z0-9-]+\.)*vimeo\.com\//i.test(url) ? url : null;
}

/**
 * Full-screen modal that plays a Vimeo video.
 *
 * On web we embed the Vimeo player in an iframe and listen to its postMessage
 * API to detect when the video finishes (fires `onEnded` at end, or once ≥95%
 * is watched). On native (no webview dependency yet) we fall back to opening the
 * video in the system browser — swap in react-native-webview for native builds.
 */
export function VideoPlayerModal({
  video,
  onClose,
  onEnded,
}: {
  video: SparkyVideo | null;
  onClose: () => void;
  /** Fired once when the video reaches the end (web only). */
  onEnded?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const embed = video ? vimeoEmbedUrl(video.url) : null;

  const iframeRef = useRef<{ contentWindow?: { postMessage: (m: string, o: string) => void } } | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  // Wire the Vimeo postMessage API: subscribe to the player's `ended` and
  // `timeupdate` events and fire onEnded exactly once when the video completes.
  useEffect(() => {
    if (Platform.OS !== 'web' || !embed) return;
    const win = (globalThis as { window?: any }).window;
    if (!win) return;
    let done = false;
    const post = (method: string, value?: string) =>
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ method, value }), '*');
    const subscribe = () => {
      post('addEventListener', 'ended');
      post('addEventListener', 'timeupdate');
    };
    const fire = () => {
      if (done) return;
      done = true;
      onEndedRef.current?.();
    };
    const onMessage = (e: { origin?: string; data?: unknown }) => {
      if (typeof e.origin === 'string' && !/player\.vimeo\.com/.test(e.origin)) return;
      let data: { event?: string; data?: { percent?: number } } | null = null;
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : (e.data as typeof data);
      } catch {
        return;
      }
      if (!data) return;
      if (data.event === 'ready') subscribe();
      else if (data.event === 'ended') fire();
      else if (data.event === 'timeupdate' && (data.data?.percent ?? 0) >= 0.95) fire();
    };
    win.addEventListener('message', onMessage);
    // The player may already be ready before we attached; nudge it.
    const t = setTimeout(subscribe, 800);
    return () => {
      win.removeEventListener('message', onMessage);
      clearTimeout(t);
    };
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
