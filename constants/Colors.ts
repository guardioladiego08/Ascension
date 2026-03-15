export type ThemePaletteId =
  | 'neon_performance'
  | 'aurora_gradient'
  | 'solar_activity'
  | 'cyber_fitness'
  | 'nature_athlete';

export type HighlightTrio = {
  primary: string;
  secondary: string;
  tertiary: string;
};

export type ThemePaletteOption = {
  id: ThemePaletteId;
  name: string;
  description: string;
  trio: HighlightTrio;
};

const DARK_FOUNDATION = {
  background: '#070809',
  backgroundStrong: '#040506',
  backgroundMuted: '#0B0D0F',
  surface: '#111316',
  surfaceAlt: '#161A1E',
  surfaceRaised: '#1C2128',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.15)',
  popUpCard: '#13171CF2',
  card: '#111316',
  card2: '#161A1E',
  card3: '#1C2128',
  offset1: '#2A313A',
  txtInBckrnd: '#080B0E',
  text: '#F5F7FA',
  textPrimary: '#F5F7FA',
  textMuted: '#A8B0BA',
  textOffSt: '#7E8895',
  textInput: 'rgba(255,255,255,0.06)',
  blkText: '#06080B',
  link: '#DDE3EA',
  tab: '#090B0E',
  cardDark: '#0C0F13',
};

export type DarkThemeColors = typeof DARK_FOUNDATION & {
  highlight1: string;
  highlight2: string;
  highlight3: string;
  highlight4: string;
  primary: string;
  tint: string;
  accent: string;
  accent2: string;
  accent3: string;
  accentSoft: string;
  accentSecondarySoft: string;
  accentTertiarySoft: string;
  glowPrimary: string;
  glowSecondary: string;
  glowTertiary: string;
  gradientTop: string;
  gradientMid: string;
  gradientBottom: string;
  macroProtein: string;
  macroCarbs: string;
  macroFats: string;
  success: string;
  warning: string;
  danger: string;
};

export const THEME_PALETTE_OPTIONS: ThemePaletteOption[] = [
  {
    id: 'neon_performance',
    name: 'Neon Performance',
    description: 'Modern athletic energy. Blue endurance, orange effort, green recovery.',
    trio: {
      primary: '#3A86FF',
      secondary: '#FF7A18',
      tertiary: '#7CFF6B',
    },
  },
  {
    id: 'aurora_gradient',
    name: 'Aurora Gradient',
    description: 'Premium calm energy. Cyan cardio, purple strength, coral intensity.',
    trio: {
      primary: '#00D1FF',
      secondary: '#7A5CFF',
      tertiary: '#FF6B6B',
    },
  },
  {
    id: 'solar_activity',
    name: 'Solar Activity',
    description: 'Energetic and readable. Amber movement, teal endurance, magenta intensity.',
    trio: {
      primary: '#FFA62B',
      secondary: '#2EC4B6',
      tertiary: '#E71D36',
    },
  },
  {
    id: 'cyber_fitness',
    name: 'Cyber Fitness',
    description: 'Futuristic contrast. Aqua cardio, indigo strength, pink goals.',
    trio: {
      primary: '#00F5D4',
      secondary: '#4361EE',
      tertiary: '#F72585',
    },
  },
  {
    id: 'nature_athlete',
    name: 'Nature Athlete',
    description: 'Balanced and calmer. Emerald goals, sky endurance, sunset activity.',
    trio: {
      primary: '#2ECC71',
      secondary: '#4CC9F0',
      tertiary: '#FF8C42',
    },
  },
];

export const DEFAULT_THEME_PALETTE_ID: ThemePaletteId = 'solar_activity';

export function withAlpha(hex: string, alpha: number) {
  const clamped = Math.max(0, Math.min(1, alpha));
  const normalized = hex.replace('#', '');
  const rgb = normalized.length === 8 ? normalized.slice(0, 6) : normalized;

  if (rgb.length !== 6) return hex;

  const r = Number.parseInt(rgb.slice(0, 2), 16);
  const g = Number.parseInt(rgb.slice(2, 4), 16);
  const b = Number.parseInt(rgb.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function isThemePaletteId(value: string | null): value is ThemePaletteId {
  return THEME_PALETTE_OPTIONS.some((palette) => palette.id === value);
}

export function getThemePaletteOption(
  paletteId: ThemePaletteId = DEFAULT_THEME_PALETTE_ID
) {
  return (
    THEME_PALETTE_OPTIONS.find((palette) => palette.id === paletteId) ??
    THEME_PALETTE_OPTIONS[0]
  );
}

export function buildDarkColors(
  paletteId: ThemePaletteId = DEFAULT_THEME_PALETTE_ID
): DarkThemeColors {
  const trio = getThemePaletteOption(paletteId).trio;

  return {
    ...DARK_FOUNDATION,
    highlight1: trio.primary,
    highlight2: trio.secondary,
    highlight3: trio.tertiary,
    highlight4: trio.tertiary,
    primary: trio.primary,
    tint: trio.primary,
    accent: trio.primary,
    accent2: trio.secondary,
    accent3: trio.tertiary,
    accentSoft: withAlpha(trio.primary, 0.16),
    accentSecondarySoft: withAlpha(trio.secondary, 0.16),
    accentTertiarySoft: withAlpha(trio.tertiary, 0.16),
    glowPrimary: withAlpha(trio.primary, 0.24),
    glowSecondary: withAlpha(trio.secondary, 0.16),
    glowTertiary: withAlpha(trio.tertiary, 0.14),
    gradientTop: DARK_FOUNDATION.backgroundStrong,
    gradientMid: DARK_FOUNDATION.backgroundMuted,
    gradientBottom: DARK_FOUNDATION.background,
    link: trio.primary,
    macroProtein: trio.primary,
    macroCarbs: trio.secondary,
    macroFats: trio.tertiary,
    success: '#8DE7C1',
    warning: '#FFC37A',
    danger: '#FF7A90',
  };
}

export const Colors = {
  light: {
    background: '#FFFFFF',
    text: '#111827',
    link: '#2563EB',
  },
  dark: buildDarkColors(),
};

export default Colors;
