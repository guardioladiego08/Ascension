import { StyleSheet } from 'react-native';

import {
  buildDarkColors,
  Colors,
  DEFAULT_THEME_PALETTE_ID,
  type DarkThemeColors,
  type ThemePaletteId,
} from './Colors';
import { Fonts, type AppFonts } from './Fonts';

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const Radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export type AppThemeTokens = {
  colors: DarkThemeColors;
  fonts: AppFonts;
  spacing: typeof Spacing;
  radii: typeof Radii;
};

export function createThemeTokens(
  paletteId: ThemePaletteId = DEFAULT_THEME_PALETTE_ID
): AppThemeTokens {
  return {
    colors: buildDarkColors(paletteId),
    fonts: Fonts,
    spacing: Spacing,
    radii: Radii,
  };
}

export function createGlobalStyles(theme: AppThemeTokens = createThemeTokens()) {
  const { colors, fonts, radii, spacing } = theme;

  const base = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
    },
    page: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    screenPadding: {
      paddingHorizontal: spacing.lg,
    },
    header: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.8,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.5,
    },
    subtitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    eyebrow: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    timer: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 42,
      lineHeight: 46,
      letterSpacing: -1.1,
      marginTop: spacing.xs,
    },
    panel: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
    },
    panelSoft: {
      backgroundColor: colors.card2,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    panelRaised: {
      backgroundColor: colors.card3,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    kpiCard: {
      flex: 1,
      minHeight: 96,
      backgroundColor: colors.card2,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      justifyContent: 'space-between',
    },
    kpiNumber: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.8,
    },
    kpiLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    quickCard: {
      flex: 1,
      backgroundColor: colors.card2,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
    },
    text: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    textMuted: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    subtext: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    textBold: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    textInput: {
      backgroundColor: colors.textInput,
      color: colors.text,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontFamily: fonts.body,
      fontSize: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      height: 48,
      borderRadius: radii.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      height: 48,
      borderRadius: radii.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.highlight1,
    },
    buttonSecondary: {
      height: 48,
      borderRadius: radii.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonGhost: {
      height: 48,
      borderRadius: radii.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonTextSecondary: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    chip: {
      borderRadius: radii.pill,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chipText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    underline: {
      width: 40,
      height: 3,
      borderRadius: radii.pill,
      backgroundColor: colors.highlight1,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
  });

  const chart = StyleSheet.create({
    wrap: {
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: radii.pill,
      backgroundColor: colors.accentSoft,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    text: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
  });

  return {
    ...base,
    Chart: chart,
  };
}

export function createAppTheme(
  paletteId: ThemePaletteId = DEFAULT_THEME_PALETTE_ID
) {
  const tokens = createThemeTokens(paletteId);

  return {
    ...tokens,
    globalStyles: createGlobalStyles(tokens),
  };
}

export type AppTheme = ReturnType<typeof createAppTheme>;
export type AppGlobalStyles = ReturnType<typeof createGlobalStyles>;

export const GlobalStyles = createGlobalStyles({
  colors: Colors.dark,
  fonts: Fonts,
  spacing: Spacing,
  radii: Radii,
});
