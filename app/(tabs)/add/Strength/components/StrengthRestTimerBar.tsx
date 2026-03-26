import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type Props = {
  statusLabel: string;
  timeLabel: string;
  progress: number;
  ready?: boolean;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
};

const StrengthRestTimerBar: React.FC<Props> = ({
  statusLabel,
  timeLabel,
  progress,
  ready = false,
  accentColor,
  style,
  footer,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const fillColor = accentColor ?? (ready ? colors.success : colors.highlight1);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        <Text style={[styles.statusLabel, ready ? styles.statusReady : null]}>
          {statusLabel}
        </Text>
        <Text style={[styles.timeLabel, ready ? styles.timeReady : null]}>{timeLabel}</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: HOME_TONES.borderSoft,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    statusLabel: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    statusReady: {
      color: colors.success,
      fontFamily: fonts.heading,
    },
    timeLabel: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.mono,
      fontSize: 13,
      lineHeight: 16,
      fontVariant: ['tabular-nums'],
    },
    timeReady: {
      color: colors.success,
    },
    track: {
      marginTop: 8,
      height: 6,
      width: '100%',
      borderRadius: 999,
      backgroundColor: HOME_TONES.surface3,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    fill: {
      height: '100%',
      borderRadius: 999,
    },
    footer: {
      marginTop: 10,
    },
  });
}

export default StrengthRestTimerBar;
