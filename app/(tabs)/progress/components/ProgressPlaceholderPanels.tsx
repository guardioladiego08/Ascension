import React, { useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import RunningProgressPanel from './running/RunningProgressPanel';
import type { ProgressTabDefinition } from './progressTabs';

type Props = {
  tabs: ProgressTabDefinition[];
  animatedIndex: Animated.Value;
  width: number;
};

export default function ProgressPlaceholderPanels({
  tabs,
  animatedIndex,
  width,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const translateX = animatedIndex.interpolate({
    inputRange: tabs.map((_, index) => index),
    outputRange: tabs.map((_, index) => -index * width),
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.viewport}>
      <Animated.View
        style={[
          styles.row,
          {
            width: width * tabs.length,
            transform: [{ translateX }],
          },
        ]}
      >
        {tabs.map((tab) => (
          <View key={tab.id} style={[styles.panel, { width }]}>
            <View style={styles.panelShell}>
              {tab.id === 'running' ? (
                <RunningProgressPanel />
              ) : (
                <View style={styles.placeholderContent}>
                  <Text style={styles.eyebrow}>Progress Section</Text>
                  <Text style={styles.heading}>{tab.heading}</Text>
                  <Text style={styles.subcopy}>
                    This tab is ready for components. Replace this placeholder with your
                    {` ${tab.heading.toLowerCase()} `}
                    content when you are ready.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    viewport: {
      marginTop: 18,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
    },
    panel: {
      paddingRight: 0,
    },
    panelShell: {
      minHeight: 320,
      borderRadius: 30,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 24,
      paddingVertical: 26,
      shadowColor: '#040814',
      shadowOpacity: 0.24,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    placeholderContent: {
      flex: 1,
      justifyContent: 'center',
    },
    eyebrow: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    heading: {
      marginTop: 14,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: -1,
      textAlign: 'center',
    },
    subcopy: {
      marginTop: 12,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
}
