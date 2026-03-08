import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  title: string;
  paused: boolean;
  seconds: number;
  onPauseToggle: () => void;
  onCancel: () => void;
};

const SessionHeader: React.FC<Props> = ({
  title,
  paused,
  seconds,
  onPauseToggle,
  onCancel,
}) => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View style={[globalStyles.panel, styles.wrap]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={globalStyles.eyebrow}>Live session</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Log sets, track time, and finish with a cleaner session summary.
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            paused ? styles.statusPillPaused : styles.statusPillActive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              paused ? styles.statusDotPaused : styles.statusDotActive,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              paused ? styles.statusTextPaused : styles.statusTextActive,
            ]}
          >
            {paused ? 'Paused' : 'In progress'}
          </Text>
        </View>
      </View>

      <Text style={styles.timer}>{mm}:{ss}</Text>

      <View style={styles.controls}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[paused ? styles.resumeBtn : styles.pauseBtn]}
          onPress={onPauseToggle}
        >
          <Ionicons
            name={paused ? 'play' : 'pause'}
            size={16}
            color={paused ? colors.blkText : colors.text}
          />
          <Text style={paused ? styles.resumeText : styles.pauseText}>
            {paused ? 'Resume' : 'Pause'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.cancelBtn}
          onPress={onCancel}
        >
          <Ionicons name="close" size={16} color={colors.danger} />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SessionHeader;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      marginTop: 10,
      paddingBottom: 18,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 14,
    },
    copy: {
      flex: 1,
    },
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.8,
    },
    subtitle: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: 260,
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusPillActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    statusPillPaused: {
      backgroundColor: colors.accentTertiarySoft,
      borderColor: colors.glowTertiary,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    statusDotActive: {
      backgroundColor: colors.success,
    },
    statusDotPaused: {
      backgroundColor: colors.warning,
    },
    statusText: {
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    statusTextActive: {
      color: colors.highlight1,
    },
    statusTextPaused: {
      color: colors.highlight3,
    },
    timer: {
      marginTop: 20,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 52,
      lineHeight: 56,
      letterSpacing: -1.4,
    },
    controls: {
      marginTop: 18,
      flexDirection: 'row',
      gap: 12,
    },
    pauseBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    pauseText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    resumeBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.highlight1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    resumeText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    cancelBtn: {
      minWidth: 108,
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
    },
    cancelText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
  });
}
