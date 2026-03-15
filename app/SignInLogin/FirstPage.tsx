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
import AuthButton from './components/AuthButton';
import { useAuthDesignSystem } from './designSystem';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'strength',
    title: 'Strength',
    eyebrow: 'Progressive overload',
    subtitle: 'Track lifts and progress.',
    image: require('@/assets/images/bg_strength.png'),
  },
  {
    key: 'endurance',
    title: 'Endurance',
    eyebrow: 'Indoor and outdoor cardio',
    subtitle: 'Track pace, distance, and routes.',
    image: require('@/assets/images/bg_endurance.png'),
  },
  {
    key: 'nutrition',
    title: 'Nutrition',
    eyebrow: 'Daily intake',
    subtitle: 'Log meals and macros.',
    image: require('@/assets/images/bg_nutrition.png'),
  },
] as const;

export default function FirstPage() {
  const router = useRouter();
  const { colors, fonts } = useAppTheme();
  const ui = useAuthDesignSystem();
  const styles = useMemo(() => createStyles(colors, fonts, ui), [colors, fonts, ui]);

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
          <Image source={require('@/assets/images/TensrLogo.png')} style={styles.logo} />

          <Text style={styles.title}>The Only Fitness App You&apos;ll Ever Need</Text>

          <View style={styles.slideCardWrap}>
            <View style={styles.slideCard}>
              <Text style={styles.slideEyebrow}>{activeSlide.eyebrow}</Text>
              <Text style={styles.slideTitle}>{activeSlide.title}</Text>
              <Text style={styles.slideSubtitle}>{activeSlide.subtitle}</Text>
            </View>
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
          <AuthButton label="Create account" onPress={() => router.push('/SignInLogin/SignupEmail')} />
          <AuthButton
            label="Log in"
            variant="secondary"
            onPress={() => router.push('/SignInLogin/Login')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts'],
  ui: ReturnType<typeof useAuthDesignSystem>
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
      backgroundColor: 'rgba(2, 6, 10, 0.46)',
    },
    content: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: ui.screen.horizontalPadding,
      paddingTop: ui.spacing.s20,
      paddingBottom: 28,
    },
    brandPanel: {
      marginTop: 'auto',
      gap: ui.spacing.s20,
      borderRadius: 32,
      paddingHorizontal: 24,
      paddingVertical: 24,
      backgroundColor: 'rgba(19, 21, 24, 0.7)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    logo: {
      width: 88,
      height: 88,
      alignSelf: 'center',
    },
    title: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 36,
      lineHeight: 40,
      letterSpacing: -1.1,
      textAlign: 'center',
    },
    slideCardWrap: {
      minHeight: 154,
      justifyContent: 'center',
    },
    slideCard: {
      ...ui.fragments.cardSoft,
      gap: 6,
      backgroundColor: 'rgba(22, 30, 41, 0.86)',
    },
    slideEyebrow: {
      color: ui.tones.accentStrong,
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
      gap: 10,
      justifyContent: 'space-between',
    },
    chipButton: {
      flex: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: ui.visuals.hairline,
      alignItems: 'center',
    },
    chipButtonSelected: {
      backgroundColor: ui.tones.accentSoft,
      borderColor: ui.tones.accentBorder,
    },
    chipText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
    chipTextSelected: {
      color: colors.text,
    },
    actions: {
      gap: ui.spacing.s12,
      marginTop: ui.spacing.s20,
    },
  });
}
