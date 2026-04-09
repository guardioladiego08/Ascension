import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

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
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View style={[styles.panel, styles.wrap]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Live session</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>

        <View style={styles.metaRight}>
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
          <Text style={styles.timer}>{mm}:{ss}</Text>
        </View>
      </View>

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
    panel: {
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 14,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    wrap: {
      marginTop: 8,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    copy: {
      flex: 1,
    },
    metaRight: {
      alignItems: 'flex-end',
      gap: 8,
    },
    title: {
      marginTop: 6,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.4,
      maxWidth: 220,
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      fontSize: 10.5,
      lineHeight: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    statusTextActive: {
      color: colors.highlight1,
    },
    statusTextPaused: {
      color: colors.highlight3,
    },
    timer: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 34,
      lineHeight: 36,
      letterSpacing: -0.8,
    },
    controls: {
      marginTop: 10,
      flexDirection: 'row',
      gap: 10,
    },
    pauseBtn: {
      flex: 1,
      minHeight: 42,
      borderRadius: 14,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    pauseText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
    resumeBtn: {
      flex: 1,
      minHeight: 42,
      borderRadius: 14,
      backgroundColor: colors.highlight1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    resumeText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
    cancelBtn: {
      minWidth: 96,
      minHeight: 42,
      borderRadius: 14,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
    },
    cancelText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
  });
}
