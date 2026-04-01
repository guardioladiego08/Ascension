import React, { useMemo } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { ProgressTabDefinition } from './progressTabs';

type Props = {
  tabs: ProgressTabDefinition[];
  activeIndex: number;
  animatedIndex: Animated.Value;
  width: number;
  onSelect: (index: number) => void;
};

export default function ProgressTopTabs({
  tabs,
  activeIndex,
  animatedIndex,
  width,
  onSelect,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const tabWidth = Math.max((width - 8) / Math.max(tabs.length, 1), 0);
  const indicatorTranslateX = animatedIndex.interpolate({
    inputRange: tabs.map((_, index) => index),
    outputRange: tabs.map((_, index) => index * tabWidth),
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.shell}>
      <View style={styles.track}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: tabWidth,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />

        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelect(index)}
              style={styles.tab}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                {tab.label}
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
      marginTop: 20,
    },
    track: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 4,
      overflow: 'hidden',
    },
    indicator: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      left: 4,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
    },
    tab: {
      flex: 1,
      minHeight: 52,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.55,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    tabLabelActive: {
      color: colors.text,
    },
  });
}
