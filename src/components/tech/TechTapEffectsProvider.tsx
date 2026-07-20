import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { techTokens } from '../../theme/tech/tokens';

type Burst = {
  id: number;
  x: number;
  y: number;
};

type TouchOrigin = {
  x: number;
  y: number;
  startedAt: number;
  moved: boolean;
};

function TapBurst({
  burst,
  particleCount,
  onDone,
}: {
  burst: Burst;
  particleCount: number;
  onDone: (id: number) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 430,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished) onDone(burst.id);
    });
    return () => animation.stop();
  }, [burst.id, onDone, progress]);

  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, index) => {
        const angle = (Math.PI * 2 * index) / particleCount - Math.PI / 2;
        const distance = 24 + (index % 3) * 8;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 3 + (index % 2),
          color:
            index % 3 === 0
              ? techTokens.colors.secondary
              : index % 3 === 1
                ? techTokens.colors.success
                : techTokens.colors.primary,
        };
      }),
    [particleCount],
  );

  return (
    <View pointerEvents="none" style={[styles.burst, { left: burst.x - 28, top: burst.y - 28 }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.75, 0.24, 0] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1.35] }) }],
          },
        ]}
      />
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size,
              backgroundColor: particle.color,
              opacity: progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.9, 0.76, 0] }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y] }) },
                { scale: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.4, 1, 0.2] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function TechTapEffectsProvider({ children }: { children: React.ReactNode }) {
  const { isTech, motionLevel, motion } = useVisualStyle();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(1);
  const touch = useRef<TouchOrigin | null>(null);

  const enabled = isTech && motion.decorative && motionLevel !== 'reduced' && motionLevel !== 'off';
  const particleCount = motionLevel === 'full' ? 7 : 5;
  const maxBursts = motionLevel === 'full' ? 4 : 3;

  function readPoint(event: GestureResponderEvent) {
    return { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
  }

  function handleTouchStart(event: GestureResponderEvent) {
    if (!enabled) return;
    const point = readPoint(event);
    touch.current = { ...point, startedAt: Date.now(), moved: false };
  }

  function handleTouchMove(event: GestureResponderEvent) {
    const origin = touch.current;
    if (!origin || origin.moved) return;
    const point = readPoint(event);
    if (Math.hypot(point.x - origin.x, point.y - origin.y) > 10) origin.moved = true;
  }

  function handleTouchEnd(event: GestureResponderEvent) {
    const origin = touch.current;
    touch.current = null;
    if (!enabled || !origin || origin.moved || Date.now() - origin.startedAt > 650) return;
    const point = readPoint(event);
    setBursts(current => {
      if (current.length >= maxBursts) return current;
      return [...current, { id: nextId.current++, x: point.x, y: point.y }];
    });
  }

  const removeBurst = React.useCallback((id: number) => {
    setBursts(current => current.filter(item => item.id !== id));
  }, []);

  return (
    <View
      style={styles.root}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touch.current = null;
      }}
    >
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bursts.map(burst => (
          <TapBurst
            key={burst.id}
            burst={burst}
            particleCount={particleCount}
            onDone={removeBurst}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  burst: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: techTokens.colors.primary,
  },
  particle: { position: 'absolute' },
});
