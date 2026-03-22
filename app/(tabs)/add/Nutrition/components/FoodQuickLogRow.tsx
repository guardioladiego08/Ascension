import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type FoodQuickLogRowProps = {
  name: string;
  brand?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  subtitle?: string | null;
  selected?: boolean;
  onPress: () => void;
  actionLabel?: string;
  actionLoading?: boolean;
  onActionPress?: () => void;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onToggleFavorite?: () => void;
};

function toMetricText(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '--';
  return `${Math.round(value)}g`;
}

export default function FoodQuickLogRow({
  name,
  brand,
  calories,
  protein,
  carbs,
  fat,
  subtitle,
  selected = false,
  onPress,
  actionLabel,
  actionLoading = false,
  onActionPress,
  isFavorite = false,
  favoriteLoading = false,
  onToggleFavorite,
}: FoodQuickLogRowProps) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <TouchableOpacity
      style={[styles.card, selected ? styles.cardSelected : null]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.headerRow}>
        <View style={styles.copyWrap}>
          <Text style={styles.title}>{name}</Text>
          {brand ? <Text style={styles.brand}>{brand}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {onToggleFavorite ? (
          <TouchableOpacity
            style={styles.favoriteButton}
            activeOpacity={0.9}
            disabled={favoriteLoading}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
          >
            {favoriteLoading ? (
              <ActivityIndicator size="small" color={colors.highlight1} />
            ) : (
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={16}
                color={isFavorite ? colors.highlight1 : HOME_TONES.textTertiary}
              />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>kcal</Text>
          <Text style={styles.metaValue}>
            {calories != null && Number.isFinite(calories) ? Math.round(calories) : '--'}
          </Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>P</Text>
          <Text style={styles.metaValue}>{toMetricText(protein)}</Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>C</Text>
          <Text style={styles.metaValue}>{toMetricText(carbs)}</Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>F</Text>
          <Text style={styles.metaValue}>{toMetricText(fat)}</Text>
        </View>
      </View>

      {actionLabel && onActionPress ? (
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.9}
          onPress={onActionPress}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={colors.highlight1} />
          ) : (
            <Text style={styles.actionText}>{actionLabel}</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    cardSelected: {
      borderColor: colors.highlight1,
      backgroundColor: HOME_TONES.surface1,
    },
    copyWrap: {
      flex: 1,
      gap: 2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    favoriteButton: {
      width: 30,
      height: 30,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    brand: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
    },
    subtitle: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 15,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 8,
    },
    metaChip: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 56,
      alignItems: 'center',
      gap: 2,
    },
    metaLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 9,
      lineHeight: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    metaValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 14,
    },
    actionButton: {
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
  });
}
