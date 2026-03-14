import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { Text, View } from 'react-native';

import type { useAppTheme } from '@/providers/AppThemeProvider';
import type { HomeStyles } from './styles';
import type { HomeGoalLaneItem } from './types';

export function HomeGoalLanesCard({
  items,
  activeGoalCount,
  closedGoalCount,
  styles,
  colors,
  fonts,
}: {
  items: HomeGoalLaneItem[];
  activeGoalCount: number;
  closedGoalCount: number;
  styles: HomeStyles;
  colors: ReturnType<typeof useAppTheme>['colors'];
  fonts: ReturnType<typeof useAppTheme>['fonts'];
}) {
  const size = 176;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentLength = circumference / items.length;

  return (
    <View style={styles.lanesCard}>
      <View style={styles.lanesHeader}>
        <View style={styles.lanesHeaderCopy}>
          <Text style={styles.lanesEyebrow}>Daily Goals</Text>
          <Text style={styles.lanesTitle}>One ring, split into three goals</Text>
          <Text style={styles.lanesSubtitle}>
            Strength, cardio, and nutrition each own one segment and close when that goal is complete.
          </Text>
        </View>

        <View style={styles.lanesScore}>
          <Text style={styles.lanesScoreLabel}>Complete</Text>
          <Text style={styles.lanesScoreValue}>
            {activeGoalCount ? `${closedGoalCount}/${activeGoalCount}` : '0'}
          </Text>
        </View>
      </View>

      <View style={styles.ringsLayout}>
        <View style={styles.ringsVisualWrap}>
          <Svg width={size} height={size}>
            {items.map((item, index) => {
              const consumed = index * segmentLength;
              const dashOffset = circumference * 0.25 - consumed;
              const progressLength = item.active ? segmentLength * item.progress : 0;

              return (
                <React.Fragment key={item.key}>
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={colors.card3}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    fill="none"
                    strokeDasharray={`${segmentLength} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    rotation={-90}
                    originX={size / 2}
                    originY={size / 2}
                  />
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    fill="none"
                    strokeDasharray={`${progressLength} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    rotation={-90}
                    originX={size / 2}
                    originY={size / 2}
                    opacity={item.active ? 1 : 0.18}
                  />
                </React.Fragment>
              );
            })}
          </Svg>

          <View style={styles.ringCenter}>
            <Text style={styles.ringCenterValue}>
              {activeGoalCount ? `${closedGoalCount}/${activeGoalCount}` : '0'}
            </Text>
            <Text style={styles.ringCenterLabel}>rings closed</Text>
          </View>
        </View>

        <View style={styles.ringsLegend}>
          {items.map((item) => (
            <View key={item.key} style={styles.ringsLegendRow}>
              <View style={[styles.ringsLegendDot, { backgroundColor: item.color }]} />

              <View style={styles.ringsLegendCopy}>
                <View style={styles.ringsLegendLabelRow}>
                  <Text style={styles.ringsLegendLabel}>{item.label}</Text>
                  <Text
                    style={[
                      styles.ringsLegendStatus,
                      { color: item.closed ? item.color : colors.textMuted, fontFamily: fonts.label },
                    ]}
                  >
                    {item.active ? (item.closed ? 'Closed' : `${Math.round(item.progress * 100)}%`) : 'Off'}
                  </Text>
                </View>

                <Text style={styles.ringsLegendSummary}>{item.summary}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
