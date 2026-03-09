import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEFAULT_THEME_PALETTE_ID,
  THEME_PALETTE_OPTIONS,
  getThemePaletteOption,
  isThemePaletteId,
  type ThemePaletteId,
  type ThemePaletteOption,
} from '@/constants/Colors';
import {
  createAppTheme,
  type AppGlobalStyles,
  type AppTheme,
} from '@/constants/GlobalStyles';
import { Fonts, type AppFonts } from '@/constants/Fonts';

const LEGACY_STORAGE_KEY = 'app-theme.palette-id.v1';
const STORAGE_KEY = 'app-theme.palette-preference.v2';

type StoredPalettePreference = {
  explicit: true;
  paletteId: ThemePaletteId;
};

type AppThemeContextValue = {
  theme: AppTheme;
  colors: AppTheme['colors'];
  fonts: AppFonts;
  globalStyles: AppGlobalStyles;
  paletteOptions: ThemePaletteOption[];
  selectedPaletteId: ThemePaletteId;
  selectedPalette: ThemePaletteOption;
  isHydrated: boolean;
  setSelectedPaletteId: (paletteId: ThemePaletteId) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [selectedPaletteId, setSelectedPaletteIdState] =
    useState<ThemePaletteId>(DEFAULT_THEME_PALETTE_ID);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPalettePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<StoredPalettePreference>;
          if (
            mounted &&
            parsed.explicit === true &&
            typeof parsed.paletteId === 'string' &&
            isThemePaletteId(parsed.paletteId)
          ) {
            setSelectedPaletteIdState(parsed.paletteId);
          }
        }
      } catch (error) {
        console.warn('[AppThemeProvider] Failed to load palette preference', error);
      } finally {
        AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => null);
        if (mounted) {
          setIsHydrated(true);
        }
      }
    };

    loadPalettePreference();

    return () => {
      mounted = false;
    };
  }, []);

  const setSelectedPaletteId = useCallback(async (paletteId: ThemePaletteId) => {
    setSelectedPaletteIdState(paletteId);

    try {
      const preference: StoredPalettePreference = {
        explicit: true,
        paletteId,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
    } catch (error) {
      console.warn('[AppThemeProvider] Failed to save palette preference', error);
    }
  }, []);

  const theme = useMemo(() => createAppTheme(selectedPaletteId), [selectedPaletteId]);
  const selectedPalette = useMemo(
    () => getThemePaletteOption(selectedPaletteId),
    [selectedPaletteId]
  );

  const value = useMemo(
    () => ({
      theme,
      colors: theme.colors,
      fonts: Fonts,
      globalStyles: theme.globalStyles,
      paletteOptions: THEME_PALETTE_OPTIONS,
      selectedPaletteId,
      selectedPalette,
      isHydrated,
      setSelectedPaletteId,
    }),
    [isHydrated, selectedPalette, selectedPaletteId, setSelectedPaletteId, theme]
  );

  return (
    <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
