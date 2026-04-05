import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { supabase } from '@/lib/supabase';
import {
  getCurrentUserPreferencesRow,
  upsertCurrentUserPreferences,
} from '@/lib/userPreferences';

const LEGACY_STORAGE_KEY = 'app-theme.palette-id.v1';
const STORAGE_KEY = 'app-theme.palette-preference.v2';

type StoredPalettePreference = {
  explicit: true;
  paletteId: ThemePaletteId;
};

type ThemePreferenceRow = {
  theme_palette_id: string | null;
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

async function readStoredPalettePreference(): Promise<StoredPalettePreference | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  const parsed = JSON.parse(stored) as Partial<StoredPalettePreference>;
  if (
    parsed.explicit === true &&
    typeof parsed.paletteId === 'string' &&
    isThemePaletteId(parsed.paletteId)
  ) {
    return {
      explicit: true,
      paletteId: parsed.paletteId,
    };
  }

  return null;
}

async function persistStoredPalettePreference(paletteId: ThemePaletteId) {
  const preference: StoredPalettePreference = {
    explicit: true,
    paletteId,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [selectedPaletteId, setSelectedPaletteIdState] =
    useState<ThemePaletteId>(DEFAULT_THEME_PALETTE_ID);
  const [isHydrated, setIsHydrated] = useState(false);
  const isMountedRef = useRef(true);
  const remoteSyncSequenceRef = useRef(0);
  const localMutationSequenceRef = useRef(0);

  const syncPalettePreferenceFromBackend = useCallback(async () => {
    const syncSequence = ++remoteSyncSequenceRef.current;
    const localMutationSequence = localMutationSequenceRef.current;
    const localPreference = await readStoredPalettePreference().catch((error) => {
      console.warn('[AppThemeProvider] Failed to load palette preference', error);
      return null;
    });

    try {
      const data = await getCurrentUserPreferencesRow<ThemePreferenceRow>(
        'theme_palette_id'
      );

      const remotePaletteId =
        data?.theme_palette_id && isThemePaletteId(data.theme_palette_id)
          ? data.theme_palette_id
          : null;

      if (remotePaletteId) {
        if (
          !isMountedRef.current ||
          syncSequence !== remoteSyncSequenceRef.current ||
          localMutationSequence !== localMutationSequenceRef.current
        ) {
          return;
        }

        setSelectedPaletteIdState(remotePaletteId);
        await persistStoredPalettePreference(remotePaletteId);
        return;
      }

      if (localPreference) {
        await upsertCurrentUserPreferences({
          theme_palette_id: localPreference.paletteId,
        });
      }
    } catch (error) {
      console.warn('[AppThemeProvider] Failed to sync palette preference', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const hydrateLocalPalettePreference = async () => {
      try {
        const stored = await readStoredPalettePreference();
        if (isMountedRef.current && stored) {
          setSelectedPaletteIdState(stored.paletteId);
        }
      } catch (error) {
        console.warn('[AppThemeProvider] Failed to load palette preference', error);
      } finally {
        AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => null);
        if (isMountedRef.current) {
          setIsHydrated(true);
        }
      }
    };

    void hydrateLocalPalettePreference();
    void syncPalettePreferenceFromBackend();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void syncPalettePreferenceFromBackend();
    });

    return () => {
      isMountedRef.current = false;
      subscription.subscription.unsubscribe();
    };
  }, [syncPalettePreferenceFromBackend]);

  const setSelectedPaletteId = useCallback(async (paletteId: ThemePaletteId) => {
    localMutationSequenceRef.current += 1;
    setSelectedPaletteIdState(paletteId);

    try {
      await persistStoredPalettePreference(paletteId);
    } catch (error) {
      console.warn('[AppThemeProvider] Failed to save palette preference', error);
    }

    try {
      await upsertCurrentUserPreferences({ theme_palette_id: paletteId });
    } catch (error) {
      console.warn('[AppThemeProvider] Failed to sync palette preference', error);
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
