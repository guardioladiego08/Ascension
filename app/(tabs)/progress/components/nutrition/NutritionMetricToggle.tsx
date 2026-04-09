import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { NutritionMetricId } from './nutritionProgressUtils';

type Props = {
  value: NutritionMetricId;
  onChange: (metricId: NutritionMetricId) => void;
};

const TRACK_PADDING = 4;

const METRIC_OPTIONS: Array<{ id: NutritionMetricId; label: string }> = [
  { id: 'calories', label: 'Calories' },
  { id: 'fat', label: 'Fats' },
  { id: 'protein', label: 'Proteins' },
  { id: 'carbs', label: 'Carbs' },
];

export default function NutritionMetricToggle({ value, onChange }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [trackWidth, setTrackWidth] = useState(0);

  const activeIndex = Math.max(
    METRIC_OPTIONS.findIndex((option) => option.id === value),
    0
  );
  const animatedIndex = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: activeIndex,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [activeIndex, animatedIndex]);

  const buttonWidth = Math.max(
    (trackWidth - TRACK_PADDING * 2) / Math.max(METRIC_OPTIONS.length, 1),
    0
  );
  const indicatorTranslateX = animatedIndex.interpolate({
    inputRange: METRIC_OPTIONS.map((_, index) => index),
    outputRange: METRIC_OPTIONS.map((_, index) => index * buttonWidth),
    extrapolate: 'clamp',
  });

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.shell}>
      <View style={styles.track} onLayout={handleTrackLayout}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: buttonWidth,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />

        {METRIC_OPTIONS.map((option) => {
          const active = option.id === value;

          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.id)}
              style={styles.button}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                numberOfLines={1}
                style={[styles.label, active ? styles.labelActive : null]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    shell: {
      width: '100%',
    },
    track: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: TRACK_PADDING,
      overflow: 'hidden',
    },
    indicator: {
      position: 'absolute',
      top: TRACK_PADDING,
      bottom: TRACK_PADDING,
      left: TRACK_PADDING,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
      borderWidth: 1,
    },
    button: {
      flex: 1,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    labelActive: {
      color: colors.text,
    },
  });
}
