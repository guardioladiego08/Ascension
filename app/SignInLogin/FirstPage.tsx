import React, { useRef, useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.tint;
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';

const { width } = Dimensions.get('window');

// Background image array
const BACKGROUNDS = [
  require('@/assets/images/bg_strength.png'),
  require('@/assets/images/bg_endurance.png'),
  require('@/assets/images/bg_nutrition.png'),
];

export default function FirstPage() {
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const animatedX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const cycleBackground = (direction = 1) => {
    animatedX.setValue(direction * width);
    fadeAnim.setValue(0);

    const newIndex =
      direction === 1
        ? (index + 1) % BACKGROUNDS.length
        : (index - 1 + BACKGROUNDS.length) % BACKGROUNDS.length;

    setIndex(newIndex);

    Animated.parallel([
      Animated.timing(animatedX, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Auto-cycle every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      cycleBackground(1); // move right → left
    }, 6000);
    return () => clearInterval(interval);
  }, [index]);

  // Swipe Gesture
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 20 && Math.abs(gesture.dy) < 50,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -40) cycleBackground(1); // swipe left
      if (gesture.dx > 40) cycleBackground(-1); // swipe right
    },
  });

  return (
    <SafeAreaView style={styles.container} {...panResponder.panHandlers}>
      {/* Background image */}
      <Animated.Image
        key={index}
        source={BACKGROUNDS[index]}
        style={[
          styles.backgroundImage,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.35],
            }),
            transform: [{ translateX: animatedX }], 
          },
        ]}
      />

      {/* Fade mask */}
      <View style={styles.overlay} />

      {/* Foreground hero section */}
      <View style={styles.heroWrapper}>
        {/* Blur container behind main content */}
        <View style={styles.blurBubble}>
          <Image
            source={require('@/assets/images/TensrLogo.png')}
            style={styles.logo}
          />

          <Text style={styles.title}>TENSR Fitness</Text>

          <Text style={styles.subtitle}>
            Track strength, endurance, and nutrition in one place — the only fitness app you’ll ever need.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={styles.chipButton}
            onPress={() => cycleBackground(1)}
          >
            <Text style={styles.chipText}>Strength</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chipButton}
            onPress={() => cycleBackground(1)}
          >
            <Text style={styles.chipText}>Endurance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chipButton}
            onPress={() => cycleBackground(1)}
          >
            <Text style={styles.chipText}>Nutrition</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('./Login')}
        >
          <Text style={styles.secondaryText}>Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('./SignupEmail')}
        >
          <Text style={styles.secondaryText}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 20 },

  backgroundImage: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    left: 0,
    resizeMode: 'cover',
  },


  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000066',
  },

  heroWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },

  blurBubble: {
    borderRadius: 24,
    padding: 20,
    width: '92%',
    alignItems: 'center',

  },

  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 12,
  },

  title: {
    fontSize: 32,
    color: TEXT_PRIMARY,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    maxWidth: 300,
  },

  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  chipButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ffffff04',
    borderWidth: 1,
    borderColor: '#ffffff77',
  },
  chipText: {
    fontSize: 12,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },

  bottomButtons: {
    paddingBottom: 32,
    gap: 10,
  },

  button: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButton: { backgroundColor: PRIMARY },
  secondaryButton: { borderWidth: 1, borderColor: '#3A465E' },

  primaryText: { color: '#020817', fontWeight: '700' },
  secondaryText: { color: TEXT_PRIMARY, fontWeight: '600' },
});
