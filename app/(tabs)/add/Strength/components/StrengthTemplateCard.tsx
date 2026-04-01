import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { StrengthWorkoutTemplate } from '@/lib/strength/templates';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type Props = {
  template: StrengthWorkoutTemplate;
  onPress: () => void;
};

function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Saved template';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function StrengthTemplateCard({ template, onPress }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{formatCreatedAt(template.createdAt)}</Text>
          <Text style={styles.title}>{template.title}</Text>
          <Text style={styles.meta}>
            {template.totalExercises} exercises • {template.totalSets} sets
          </Text>
        </View>

        <View style={styles.iconWrap}>
          <Ionicons name="barbell-outline" size={18} color={colors.highlight1} />
        </View>
      </View>

      {template.previewExerciseNames.length > 0 ? (
        <View style={styles.previewWrap}>
          {template.previewExerciseNames.map((name) => (
            <View key={`${template.id}:${name}`} style={styles.previewPill}>
              <Text style={styles.previewText} numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {template.visibility === 'private' ? 'Private template' : 'Share-ready template'}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.highlight1} />
      </View>
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
      gap: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
      gap: 4,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    title: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.6,
    },
    meta: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    previewPill: {
      maxWidth: '100%',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    previewText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    footerText: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
  });
}
