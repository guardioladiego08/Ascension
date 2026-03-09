import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { withAlpha } from '@/constants/Colors';
import { useAppTheme } from '@/providers/AppThemeProvider';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'strength',
    title: 'Strength',
    eyebrow: 'Progressive overload',
    subtitle: 'Track exercises, sets, PRs, and progression without leaving the session flow.',
    image: require('@/assets/images/bg_strength.png'),
  },
  {
    key: 'endurance',
    title: 'Endurance',
    eyebrow: 'Indoor and outdoor cardio',
    subtitle: 'Capture pace, distance, routes, and recovery in the same dark, focused interface.',
    image: require('@/assets/images/bg_endurance.png'),
  },
  {
    key: 'nutrition',
    title: 'Nutrition',
    eyebrow: 'Daily intake',
    subtitle: 'Log meals, scan food, and review macros in one place tied back to training.',
    image: require('@/assets/images/bg_nutrition.png'),
  },
] as const;

export default function FirstPage() {
  const router = useRouter();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [index, setIndex] = useState(0);
  const animatedX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goToIndex = (nextIndex: number, direction: 1 | -1 = 1) => {
    if (nextIndex === index) return;

    animatedX.setValue(direction * width * 0.14);
    fadeAnim.setValue(0.55);
    setIndex(nextIndex);

    Animated.parallel([
      Animated.timing(animatedX, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const cycleBackground = (direction: 1 | -1) => {
    const nextIndex =
      direction === 1
        ? (index + 1) % SLIDES.length
        : (index - 1 + SLIDES.length) % SLIDES.length;

    goToIndex(nextIndex, direction);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      cycleBackground(1);
    }, 6000);

    return () => clearInterval(interval);
  }, [index]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 20 && Math.abs(gesture.dy) < 50,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -40) cycleBackground(1);
      if (gesture.dx > 40) cycleBackground(-1);
    },
  });

  const activeSlide = SLIDES[index];

  return (
    <SafeAreaView style={styles.container} {...panResponder.panHandlers}>
      <Animated.Image
        key={activeSlide.key}
        source={activeSlide.image}
        style={[
          styles.backgroundImage,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.22, 0.42],
            }),
            transform: [{ translateX: animatedX }],
          },
        ]}
      />
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.brandPanel}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>Tensr</Text>
          </View>

          <Image source={require('@/assets/images/TensrLogo.png')} style={styles.logo} />

          <Text style={styles.title}>One place for training, recovery, and nutrition.</Text>
          <Text style={styles.subtitle}>
            A dark, focused system for tracking performance without bouncing between apps.
          </Text>

          <View style={styles.slideCard}>
            <Text style={styles.slideEyebrow}>{activeSlide.eyebrow}</Text>
            <Text style={styles.slideTitle}>{activeSlide.title}</Text>
            <Text style={styles.slideSubtitle}>{activeSlide.subtitle}</Text>
          </View>

          <View style={styles.chipRow}>
            {SLIDES.map((slide, slideIndex) => {
              const selected = slideIndex === index;
              return (
                <TouchableOpacity
                  key={slide.key}
                  activeOpacity={0.92}
                  style={[styles.chipButton, selected ? styles.chipButtonSelected : null]}
                  onPress={() => goToIndex(slideIndex, slideIndex > index ? 1 : -1)}
                >
                  <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>
                    {slide.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.92}
            onPress={() => router.push('/SignInLogin/SignupEmail')}
          >
            <Text style={styles.primaryButtonText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.92}
            onPress={() => router.push('/SignInLogin/Login')}
          >
            <Text style={styles.secondaryButtonText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundStrong,
    },
    backgroundImage: {
      position: 'absolute',
      width: '120%',
      height: '110%',
      left: '-10%',
      top: 0,
      resizeMode: 'cover',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(1, 4, 8, 0.7)',
    },
    content: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 28,
    },
    brandPanel: {
      marginTop: 'auto',
      gap: 16,
      borderRadius: 32,
      paddingHorizontal: 22,
      paddingVertical: 24,
      backgroundColor: withAlpha(colors.surface, 0.9),
      borderWidth: 1,
      borderColor: colors.border,
    },
    brandBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.accentSoft,
    },
    brandBadgeText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    logo: {
      width: 88,
      height: 88,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: -1,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
    },
    slideCard: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    slideEyebrow: {
      color: colors.accent,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    slideTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
    },
    slideSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chipButton: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    chipButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
    chipTextSelected: {
      color: colors.blkText,
    },
    actions: {
      gap: 12,
      marginTop: 20,
    },
    primaryButton: {
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    secondaryButton: {
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.surfaceRaised, 0.95),
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
  });
}
