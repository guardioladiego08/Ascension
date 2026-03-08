export type ThemePaletteId =
  | 'orange'
  | 'red'
  | 'green'
  | 'blue'
  | 'violet';

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
  background: '#04070B',
  backgroundStrong: '#020406',
  backgroundMuted: '#081018',
  surface: '#0E141B',
  surfaceAlt: '#131C25',
  surfaceRaised: '#18232E',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.15)',
  popUpCard: '#111922F2',
  card: '#0E141B',
  card2: '#131C25',
  card3: '#18232E',
  offset1: '#273443',
  txtInBckrnd: '#071015',
  text: '#F5F7FA',
  textPrimary: '#F5F7FA',
  textMuted: '#9AA5B2',
  textOffSt: '#6F7B88',
  textInput: 'rgba(255,255,255,0.06)',
  blkText: '#071015',
  link: '#7FD6FF',
  tab: '#06090E',
  cardDark: '#071015',
} as const;

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
    id: 'orange',
    name: 'Orange',
    description: 'Tangerine, burnt orange, and amber in one warm family.',
    trio: {
      primary: '#FF9E3D',
      secondary: '#FF7A1A',
      tertiary: '#FFC36B',
    },
  },
  {
    id: 'red',
    name: 'Red',
    description: 'Signal red, crimson, and rose for a sharper high-energy look.',
    trio: {
      primary: '#FF6B6B',
      secondary: '#E63946',
      tertiary: '#FF9AA2',
    },
  },
  {
    id: 'green',
    name: 'Green',
    description: 'Mint, emerald, and lime with a cleaner recovery-style feel.',
    trio: {
      primary: '#7FE7B3',
      secondary: '#2FBF71',
      tertiary: '#B7F171',
    },
  },
  {
    id: 'blue',
    name: 'Blue',
    description: 'Sky, cobalt, and indigo for a colder performance palette.',
    trio: {
      primary: '#7AD7FF',
      secondary: '#3B82F6',
      tertiary: '#8CA2FF',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Lavender, violet, and deep purple in one cooler accent family.',
    trio: {
      primary: '#C6A7FF',
      secondary: '#9B5DE5',
      tertiary: '#6D28D9',
    },
  },
];

export const DEFAULT_THEME_PALETTE_ID: ThemePaletteId = 'orange';

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
