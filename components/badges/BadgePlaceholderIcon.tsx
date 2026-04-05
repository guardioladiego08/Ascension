import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { BadgeDomain } from '@/lib/badges/types';

function pickAccent(domain: BadgeDomain, colors: ReturnType<typeof useAppTheme>['colors']) {
  switch (domain) {
    case 'nutrition':
      return {
        background: colors.accentSoft,
        border: colors.glowPrimary,
        text: colors.highlight1,
      };
    case 'running':
      return {
        background: colors.accentSecondarySoft,
        border: colors.glowSecondary,
        text: colors.highlight2,
      };
    case 'strength':
    default:
      return {
        background: colors.accentTertiarySoft,
        border: colors.glowTertiary,
        text: colors.highlight3,
      };
  }
}

function buildMonogram(value: string) {
  const normalized = value
    .replace(/^badge-/, '')
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return normalized || 'BD';
}

export default function BadgePlaceholderIcon({
  iconPlaceholder,
  domain,
  size = 44,
}: {
  iconPlaceholder: string;
  domain: BadgeDomain;
  size?: number;
}) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const accent = pickAccent(domain, colors);
  const monogram = buildMonogram(iconPlaceholder);

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2),
          backgroundColor: accent.background,
          borderColor: accent.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: accent.text,
            fontSize: Math.max(11, Math.round(size * 0.28)),
          },
        ]}
      >
        {monogram}
      </Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    shell: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      shadowColor: colors.backgroundStrong,
      shadowOpacity: 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    label: {
      fontFamily: fonts.label,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
  });
}
