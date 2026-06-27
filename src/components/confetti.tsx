import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Colors } from '@/constants/theme';

const PALETTE = [
  Colors.orange,
  Colors.primary,
  Colors.success,
  Colors.star,
  Colors.lightBlue,
  '#7A5AF8',
  Colors.orangePale,
];

export type ConfettiProps = { count?: number };

/** Lightweight falling-confetti burst (pure Animated, no native deps). */
export function Confetti({ count = 90 }: ConfettiProps) {
  const { width, height } = useWindowDimensions();

  const pieces = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random() * width,
      size: 6 + Math.random() * 8,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      delay: Math.random() * 500,
      duration: 2400 + Math.random() * 1600,
      drift: (Math.random() - 0.5) * 160,
      spin: 360 + Math.random() * 540,
      anim: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    const animations = pieces.map((p) =>
      Animated.timing(p.anim, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    Animated.parallel(animations).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-40, height + 40] });
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] });
        const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: 0,
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: 2,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
