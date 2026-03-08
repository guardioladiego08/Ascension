import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  title?: string;
  description: string;
};

export default function GoalAchievementCard({
  title = 'Goal reached',
  description,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark-circle" size={18} color={colors.blkText} />
      </View>
      <View style={styles.copyWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.highlight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyWrap: {
      flex: 1,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    description: {
      marginTop: 3,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}
