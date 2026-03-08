import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  title: string;
  subtitle: string;
  meta?: string;
  badgeText?: string;
  badgeTone?: 'neutral' | 'success' | 'accent';
  onPress: () => void;
};

export default function HistoryListItem({
  title,
  subtitle,
  meta,
  badgeText,
  badgeTone = 'neutral',
  onPress,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.card} onPress={onPress}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badgeText ? (
            <View
              style={[
                styles.badge,
                badgeTone === 'success'
                  ? styles.badgeSuccess
                  : badgeTone === 'accent'
                    ? styles.badgeAccent
                    : styles.badgeNeutral,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  badgeTone === 'success'
                    ? styles.badgeTextSuccess
                    : badgeTone === 'accent'
                      ? styles.badgeTextAccent
                      : styles.badgeTextNeutral,
                ]}
              >
                {badgeText}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textOffSt} />
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    left: {
      flex: 1,
      paddingRight: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    title: {
      fontSize: 15,
      lineHeight: 19,
      color: colors.text,
      fontFamily: fonts.heading,
    },
    subtitle: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textMuted,
      fontFamily: fonts.body,
    },
    meta: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textOffSt,
      fontFamily: fonts.body,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
    },
    badgeNeutral: {
      backgroundColor: colors.card3,
      borderColor: colors.border,
    },
    badgeAccent: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accentSoft,
    },
    badgeSuccess: {
      backgroundColor: 'rgba(141, 231, 193, 0.14)',
      borderColor: 'rgba(141, 231, 193, 0.28)',
    },
    badgeText: {
      fontSize: 11,
      lineHeight: 13,
      fontFamily: fonts.label,
      letterSpacing: 0.35,
      textTransform: 'uppercase',
    },
    badgeTextNeutral: {
      color: colors.textMuted,
    },
    badgeTextAccent: {
      color: colors.highlight1,
    },
    badgeTextSuccess: {
      color: colors.success,
    },
  });
}
