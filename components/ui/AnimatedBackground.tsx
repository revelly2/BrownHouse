import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants/colors';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const AnimatedBackground = ({ children }: { children?: React.ReactNode }) => {
  const { width, height } = useWindowDimensions();
  
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 10000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: progress.value * -height * 0.3 },
        { translateX: progress.value * -width * 0.1 }
      ],
    };
  });

  return (
    <View style={styles.container}>
      <AnimatedLinearGradient
        colors={[
          '#1a1410', // Dark warm brown
          '#0a0a0c', 
          '#120d09', // Deep brown/black
          '#050505'
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          { height: height * 1.5, width: width * 1.2 },
          animatedStyle,
        ]}
      />
      
      {/* Global Tribal/Geometric Line Art */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.8 }]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          {/* Top Left Tribal Accent */}
          <Path 
            d="M-50 200 L150 0 L350 200 L550 0 M150 0 L150 -50 M350 200 L350 350" 
            fill="none" 
            stroke={Colors.primary} 
            strokeWidth={8}
            strokeOpacity={0.3}
          />
          {/* Middle Zigzag Pattern */}
          <Path 
            d="M1000 400 L850 550 L1000 700 M850 550 L700 400 L550 550 L400 400 L250 550 M550 550 L700 700 L850 550" 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={6}
          />
          {/* Diagonal Cuts */}
          <Path 
            d="M-100 800 L300 1200 M-50 800 L250 1100 M0 800 L200 1000" 
            fill="none" 
            stroke={Colors.primary}
            strokeWidth={5}
            strokeOpacity={0.25}
          />
          {/* Bottom Right Geometric */}
          <Path 
            d="M600 1100 L750 950 L900 1100 L1050 950 M750 950 L900 800 L1050 950" 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth={6}
          />
          {/* Abstract Circle/Lines */}
          <Path 
            d="M 500 500 m -200 0 a 200 200 0 1 0 400 0 a 200 200 0 1 0 -400 0" 
            fill="none" 
            stroke="rgba(230, 200, 79, 0.1)"
            strokeWidth={3}
            strokeDasharray="15, 25"
          />
        </Svg>
      </View>

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c', // Dark base
  },
});
