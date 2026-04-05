import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

type SummaryCardItem = {
  key: string;
  label: string;
  value: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'primary' | 'secondary' | 'tertiary';
};

type Props = {
  items: SummaryCardItem[];
};

export default function StrengthSummaryCards({ items }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const toneStyle =
          item.tone === 'secondary'
            ? styles.iconWrapSecondary
            : item.tone === 'tertiary'
              ? styles.iconWrapTertiary
              : styles.iconWrapPrimary;

        const iconColor =
          item.tone === 'secondary'
            ? colors.highlight2
            : item.tone === 'tertiary'
              ? colors.highlight3
              : colors.highlight1;

        return (
          <View key={item.key} style={styles.card}>
            <View style={[styles.iconWrap, toneStyle]}>
              <Ionicons name={item.icon} size={18} color={iconColor} />
            </View>

            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.detail}>{item.detail}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    grid: {
      marginTop: 18,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    card: {
      width: '48%',
      minWidth: 140,
      flexGrow: 1,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapPrimary: {
      backgroundColor: colors.accentSoft,
    },
    iconWrapSecondary: {
      backgroundColor: colors.accentSecondarySoft,
    },
    iconWrapTertiary: {
      backgroundColor: colors.accentTertiarySoft,
    },
    label: {
      marginTop: 12,
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    value: {
      marginTop: 10,
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 22,
      lineHeight: 26,
    },
    detail: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
