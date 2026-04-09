import Svg, { Circle } from 'react-native-svg';
import { Text, View } from 'react-native';

import type { HomeStyles } from './styles';
import type { HomeGoalLaneItem } from './types';
import { HOME_TONES } from './tokens';

export function HomeGoalLanesCard({
  items,
  closedGoalCount,
  styles,
  fonts,
}: {
  items: HomeGoalLaneItem[];
  closedGoalCount: number;
  styles: HomeStyles;
  fonts: { label: string };
}) {
  const size = 176;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const totalGoals = items.length || 3;
  const completionRatio = Math.max(0, Math.min(1, closedGoalCount / totalGoals));
  const progressLength = circumference * completionRatio;

  return (
    <View style={styles.lanesCard}>
      <Text style={styles.lanesEyebrow}>Daily Goals</Text>

      <View style={styles.ringsLayout}>
        <View style={styles.ringsVisualWrap}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={HOME_TONES.surface3}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={HOME_TONES.textPrimary}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${progressLength} ${circumference}`}
              strokeDashoffset={0}
              rotation={-90}
              originX={size / 2}
              originY={size / 2}
            />
          </Svg>

          <View style={styles.ringCenter}>
            <Text style={styles.ringCenterValue}>{`${closedGoalCount}/${totalGoals}`}</Text>
            <Text style={styles.ringCenterLabel}>goals closed</Text>
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
                      {
                        color: item.closed ? item.color : HOME_TONES.textTertiary,
                        fontFamily: fonts.label,
                      },
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
