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
import { Colors } from '../../constants/colors';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const AnimatedBackground = ({ children }: { children?: React.ReactNode }) => {
  const { width, height } = useWindowDimensions();
  
  // A value that transitions between 0 and 1
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 10000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, // Infinite loop
      true // Reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: progress.value * -height * 0.3, // Move the gradient up slowly
        },
        {
          translateX: progress.value * -width * 0.1, // Slight horizontal shift
        }
      ],
    };
  });

  return (
    <View style={styles.container}>
      <AnimatedLinearGradient
        colors={[
          Colors.background, 
          '#0a0a0a', // Subtle transition color
          '#121212', // Slightly brighter dark grey
          Colors.background
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          { 
            height: height * 1.5, 
            width: width * 1.2,
          },
          animatedStyle,
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
