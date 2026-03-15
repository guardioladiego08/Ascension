import { useMemo } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';

import { withAlpha } from '@/constants/Colors';
import { useAppTheme } from '@/providers/AppThemeProvider';

type AppColors = ReturnType<typeof useAppTheme>['colors'];
type AppFonts = ReturnType<typeof useAppTheme>['fonts'];

type AuthStyleFragments = {
  card: ViewStyle;
  cardSoft: ViewStyle;
  fieldGroup: ViewStyle;
  label: TextStyle;
  helperText: TextStyle;
  helperTextStrong: TextStyle;
  linkText: TextStyle;
  input: ViewStyle & TextStyle;
  inputDense: ViewStyle & TextStyle;
  primaryButton: ViewStyle;
  secondaryButton: ViewStyle;
  buttonDisabled: ViewStyle;
  primaryButtonText: TextStyle;
  secondaryButtonText: TextStyle;
  selectionCard: ViewStyle;
  selectionCardSelected: ViewStyle;
  selectionIconWrap: ViewStyle;
  selectionIconWrapSelected: ViewStyle;
  selectionTitle: TextStyle;
  selectionTitleSelected: TextStyle;
  selectionSubtitle: TextStyle;
  selectionSubtitleSelected: TextStyle;
  checkPill: ViewStyle;
  unchecked: ViewStyle;
  tabButton: ViewStyle;
  tabButtonActive: ViewStyle;
  tabText: TextStyle;
  tabTextActive: TextStyle;
};

export type AuthDesignSystem = ReturnType<typeof buildAuthDesignSystem>;

export function useAuthDesignSystem() {
  const { colors, fonts } = useAppTheme();
  return useMemo(() => buildAuthDesignSystem(colors, fonts), [colors, fonts]);
}

export function buildAuthDesignSystem(colors: AppColors, fonts: AppFonts) {
  const spacing = {
    s4: 4,
    s8: 8,
    s12: 12,
    s16: 16,
    s20: 20,
    s24: 24,
    s32: 32,
    s40: 40,
  } as const;

  const radii = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
    pill: 999,
  } as const;

  const authAccent = '#AAB2BC';
  const authAccentStrong = '#D9DEE4';
  const authAccentSoft = withAlpha('#D9DEE4', 0.14);
  const authAccentSoftStrong = withAlpha('#D9DEE4', 0.2);
  const authAccentBorder = withAlpha('#D9DEE4', 0.3);
  const surfaceStrong = withAlpha(colors.surface, 0.92);
  const surfaceSoft = withAlpha(colors.surfaceRaised, 0.96);
  const surfaceTonal = authAccentSoft;
  const surfaceTonalStrong = authAccentSoftStrong;
  const outlineStrong = authAccentBorder;
  const heroOverlay = 'rgba(2, 5, 10, 0.72)';

  const fragments: AuthStyleFragments = {
    card: {
      borderRadius: radii.xl,
      padding: spacing.s24,
      gap: spacing.s16,
      backgroundColor: surfaceStrong,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardSoft: {
      borderRadius: radii.xl,
      padding: spacing.s20,
      gap: spacing.s12,
      backgroundColor: withAlpha(colors.surfaceRaised, 0.82),
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldGroup: {
      gap: spacing.s8,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 0.96,
      textTransform: 'uppercase',
    },
    helperText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    helperTextStrong: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 18,
    },
    linkText: {
      color: authAccentStrong,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 18,
    },
    input: {
      minHeight: 56,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: surfaceSoft,
      paddingHorizontal: spacing.s16,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 16,
      lineHeight: 22,
    },
    inputDense: {
      minHeight: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: surfaceSoft,
      paddingHorizontal: spacing.s16,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 20,
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.s8,
      backgroundColor: authAccentStrong,
    },
    secondaryButton: {
      minHeight: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.s8,
      backgroundColor: withAlpha(colors.surfaceRaised, 0.98),
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDisabled: {
      opacity: 0.62,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    secondaryButtonText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    selectionCard: {
      borderRadius: radii.lg,
      padding: 18,
      backgroundColor: surfaceStrong,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectionCardSelected: {
      backgroundColor: surfaceTonal,
      borderColor: outlineStrong,
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    selectionIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.surfaceRaised, 0.92),
    },
    selectionIconWrapSelected: {
      backgroundColor: surfaceTonalStrong,
    },
    selectionTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    selectionTitleSelected: {
      color: colors.text,
    },
    selectionSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    selectionSubtitleSelected: {
      color: withAlpha(colors.text, 0.78),
    },
    checkPill: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: authAccentStrong,
    },
    unchecked: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: withAlpha(colors.textMuted, 0.72),
    },
    tabButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: surfaceStrong,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabButtonActive: {
      backgroundColor: surfaceTonal,
      borderColor: outlineStrong,
    },
    tabText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    tabTextActive: {
      color: colors.text,
    },
  };

  return {
    colors,
    fonts,
    tones: {
      accent: authAccent,
      accentStrong: authAccentStrong,
      accentSoft: authAccentSoft,
      accentBorder: authAccentBorder,
    },
    spacing,
    radii,
    screen: {
      horizontalPadding: spacing.s20,
      topPadding: spacing.s8,
      bottomPadding: spacing.s32,
      sectionGap: spacing.s16,
    },
    visuals: {
      heroOverlay,
      heroGlowPrimary: authAccentSoft,
      heroGlowSecondary: authAccentSoft,
      heroCard: withAlpha(colors.surface, 0.84),
      hairline: withAlpha(colors.text, 0.08),
    },
    fragments,
  };
}
