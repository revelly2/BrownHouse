// ============================================================================
// AnimatedBackground — Clean, Luxury Athletic Ambient Background
// Subtle atmospheric dark mesh gradients without distracting wireframe lines
// ============================================================================

import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const AnimatedBackground = ({ children }: { children?: React.ReactNode }) => {
  const { width, height } = useWindowDimensions();
  
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 12000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const ambientGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.55 + pulse.value * 0.35,
      transform: [
        { translateY: pulse.value * -25 },
        { scale: 1 + pulse.value * 0.05 },
      ],
    };
  });

  return (
    <View style={styles.container}>
      {/* Background layer clipped and strictly non-interactive */}
      <View style={styles.backgroundLayer} pointerEvents="none">
        {/* Base dark canvas */}
        <LinearGradient
          colors={['#0e0f13', '#090a0c', '#060708']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Warm athletic ambient glow (top right) */}
        <Animated.View
          style={[
            styles.warmGlow,
            { width: Math.max(width * 0.7, 500), height: Math.max(width * 0.7, 500) },
            ambientGlowStyle,
          ]}
        />

        {/* Subtle secondary ambient glow (bottom left) */}
        <View
          style={[
            styles.coolGlow,
            { width: Math.max(width * 0.6, 400), height: Math.max(width * 0.6, 400) },
          ]}
        />
      </View>

      <View style={styles.contentLayer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#090a0c',
  },
  backgroundLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  warmGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    borderRadius: 9999,
    backgroundColor: 'rgba(245, 158, 11, 0.07)',
    ...Platform.select({
      web: {
        filter: 'blur(90px)',
      } as any,
    }),
  },
  coolGlow: {
    position: 'absolute',
    bottom: -150,
    left: -100,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    ...Platform.select({
      web: {
        filter: 'blur(100px)',
      } as any,
    }),
  },
  contentLayer: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: 1,
  },
});
