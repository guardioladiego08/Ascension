import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AppPopup from '@/components/ui/AppPopup';
import AuthScreen from '../components/AuthScreen';
import AuthButton from '../components/AuthButton';
import AuthField from '../components/AuthField';
import AppAlert from '../components/AppAlert';
import {
  sanitizeUsername,
  useOnboardingDraftStore,
} from '@/lib/onboarding/onboardingDraftStore';
import { checkSignupUsernameAvailability } from '@/lib/auth/usernameAvailability';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useUnits } from '@/contexts/UnitsContext';
import { useAuthDesignSystem } from '../designSystem';

type MapboxFeature = {
  id: string;
  text: string;
  place_name: string;
  place_type: string[];
  context?: Array<{ id: string; text: string }>;
};

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN;

function safeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function isUnitedStatesCountry(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
  return (
    normalized === 'unitedstates' ||
    normalized === 'unitedstatesofamerica' ||
    normalized === 'usa' ||
    normalized === 'us'
  );
}

export default function UserInfo1() {
  const router = useRouter();
  const { draft, setDraft } = useOnboardingDraftStore();
  const { colors, fonts } = useAppTheme();
  const { setDistanceUnit, setWeightUnit } = useUnits();
  const ui = useAuthDesignSystem();
  const styles = useMemo(() => createStyles(colors, fonts, ui), [colors, fonts, ui]);

  const [usernameInput, setUsernameInput] = useState(draft.username ?? '');
  const [firstName, setFirstName] = useState(draft.first_name ?? '');
  const [lastName, setLastName] = useState(draft.last_name ?? '');
  const [country, setCountry] = useState(draft.country ?? '');
  const [stateRegion, setStateRegion] = useState(draft.state ?? '');
  const [city, setCity] = useState(draft.city ?? '');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [ownedUsernames, setOwnedUsernames] = useState<string[]>([]);

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<MapboxFeature[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOnConfirm, setAlertOnConfirm] = useState<(() => void) | null>(null);

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOnConfirm(() => (onConfirm ? onConfirm : null));
    setAlertVisible(true);
  };

  const handleCloseAlert = () => {
    setAlertVisible(false);
    if (alertOnConfirm) {
      const cb = alertOnConfirm;
      setAlertOnConfirm(null);
      cb();
    }
  };

  const locationLabel = useMemo(() => {
    const parts = [safeString(city), safeString(stateRegion), safeString(country)].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Select location';
  }, [city, country, stateRegion]);
  const usernameSanitized = useMemo(() => sanitizeUsername(usernameInput), [usernameInput]);
  const ownedUsernameSet = useMemo(() => new Set(ownedUsernames), [ownedUsernames]);

  const loadOwnedUsernames = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return [] as string[];
    }

    const [userRowRes, profileRowRes, legacyRowRes] = await Promise.all([
      supabase
        .schema('user')
        .from('users')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .schema('public')
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('profiles_stub').select('username').eq('user_id', user.id).maybeSingle(),
    ]);

    const normalized = [
      sanitizeUsername(String(userRowRes.data?.username ?? '')),
      sanitizeUsername(String(profileRowRes.data?.username ?? '')),
      sanitizeUsername(String(legacyRowRes.data?.username ?? '')),
    ].filter((value) => value.length >= 3);

    return Array.from(new Set(normalized));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const own = await loadOwnedUsernames();
      if (cancelled) return;

      setOwnedUsernames(own);
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [loadOwnedUsernames]);

  useEffect(() => {
    if (!locationModalVisible || !MAPBOX_TOKEN) return;

    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(async () => {
      const query = locationQuery.trim();
      if (!query) {
        setLocationResults([]);
        return;
      }

      setLocationLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&types=place,locality,region,country&limit=8`;

        const response = await fetch(url);
        const json = await response.json();
        const features = Array.isArray(json?.features)
          ? (json.features as MapboxFeature[])
          : [];

        setLocationResults(features);
      } catch (_error) {
        setLocationResults([]);
      } finally {
        setLocationLoading(false);
      }
    }, 350);

    return () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    };
  }, [locationModalVisible, locationQuery]);

  const parseContext = (feature: MapboxFeature) => {
    const context = feature.context ?? [];
    const countryContext = context.find((item) => item.id?.startsWith('country'))?.text ?? '';
    const regionContext = context.find((item) => item.id?.startsWith('region'))?.text ?? '';
    const placeType = feature.place_type ?? [];

    const isCountry = placeType.includes('country');
    const isRegion = placeType.includes('region');
    const isPlace = placeType.includes('place') || placeType.includes('locality');

    return {
      country: isCountry ? feature.text : countryContext,
      state: isRegion ? feature.text : regionContext,
      city: isPlace ? feature.text : '',
    };
  };

  const handleSelectLocation = (feature: MapboxFeature) => {
    const parsed = parseContext(feature);
    setCountry(parsed.country || '');
    setStateRegion(parsed.state || '');
    setCity(parsed.city || '');
    setLocationModalVisible(false);
    setLocationQuery('');
    setLocationResults([]);
  };

  const checkUsernameAvailability = useCallback(async () => {
    Keyboard.dismiss();

    const desired = usernameSanitized;
    if (!desired) {
      showAlert('Missing info', 'Please enter a username.');
      return false;
    }

    if (desired.length < 3) {
      setUsernameAvailable(false);
      showAlert('Invalid username', 'Username must be at least 3 characters.');
      return false;
    }

    let owned = ownedUsernames;
    if (!ownedUsernameSet.has(desired) && owned.length === 0) {
      owned = await loadOwnedUsernames();
      setOwnedUsernames(owned);
    }

    if (owned.includes(desired)) {
      setUsernameAvailable(true);
      return true;
    }

    setCheckingUsername(true);
    setUsernameAvailable(null);

    const { available, error: availabilityError } =
      await checkSignupUsernameAvailability(desired);
    setCheckingUsername(false);

    if (available !== null) {
      setUsernameAvailable(available);
      if (available === false) {
        showAlert('Username taken', 'Please choose a different username.');
      }
      return available;
    }

    if (availabilityError) {
      const code = (availabilityError as any)?.code;
      if (code === '42501') {
        showAlert(
          'Username check blocked',
          'Your database RLS is preventing username checks. Create or apply the SECURITY DEFINER username-availability RPC before continuing.'
        );
        return false;
      }

      if (
        code === '42P01' ||
        code === 'PGRST106' ||
        code === 'PGRST200' ||
        code === 'PGRST205'
      ) {
        showAlert(
          'Username check unavailable',
          'The connected Supabase project is missing the canonical username-availability RPC or legacy lookup tables.'
        );
        return false;
      }
    }

    showAlert('Error', 'Could not check username right now.');
    return false;
  }, [usernameSanitized, ownedUsernames, ownedUsernameSet, loadOwnedUsernames]);

  const handleNext = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert('Missing info', 'Please enter first name and last name.');
      return;
    }

    const usernameTrimmed = usernameSanitized;
    if (!usernameTrimmed) {
      showAlert('Missing info', 'Please enter a username.');
      return;
    }

    const available = await checkUsernameAvailability();
    if (!available) {
      return;
    }

    const trimmedCountry = country.trim();
    if (trimmedCountry) {
      const useImperial = isUnitedStatesCountry(trimmedCountry);
      void setDistanceUnit(useImperial ? 'mi' : 'km');
      void setWeightUnit(useImperial ? 'lb' : 'kg');
    }

    setDraft({
      username: usernameTrimmed,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      country: trimmedCountry || null,
      state: stateRegion.trim() || null,
      city: city.trim() || null,
    });

    router.replace('/SignInLogin/onboarding/UserInfo2');
  };

  return (
    <AuthScreen
      eyebrow="Step 1 of 5"
      title="Your info"
      showBackButton
      backTo="/SignInLogin/Login"
    >
      <View style={styles.card}>
        <AuthField label="First name">
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </AuthField>

        <AuthField label="Last name">
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </AuthField>

        <AuthField label="Username">
          <View style={styles.usernameRow}>
            <TextInput
              value={usernameInput}
              onChangeText={(value) => {
                setUsernameInput(value);
                setUsernameAvailable(null);
              }}
              autoCapitalize="none"
              placeholder="my_username"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.usernameInput]}
            />

            <TouchableOpacity
              style={[
                styles.inlineButton,
                (checkingUsername || !usernameInput.trim()) && styles.inlineButtonDisabled,
              ]}
              onPress={() => {
                void checkUsernameAvailability();
              }}
              disabled={checkingUsername || !usernameInput.trim()}
              activeOpacity={0.92}
            >
              {checkingUsername ? (
                <ActivityIndicator color={colors.blkText} />
              ) : (
                <Text style={styles.inlineButtonText}>Check</Text>
              )}
            </TouchableOpacity>
          </View>
        </AuthField>

        {!!usernameInput.trim() && usernameSanitized !== usernameInput.trim().toLowerCase() ? (
          <Text style={styles.helperText}>
            Saved as <Text style={styles.helperValue}>{usernameSanitized}</Text>
          </Text>
        ) : null}

        {usernameAvailable === true ? (
          <Text style={[styles.helperText, styles.helperSuccess]}>Username is available.</Text>
        ) : null}
        {usernameAvailable === false ? (
          <Text style={[styles.helperText, styles.helperDanger]}>
            Username is already taken.
          </Text>
        ) : null}

        <AuthField
          label="Location"
          helperText="Optional. Used for local trends and relevant defaults."
        >
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.selectField}
            onPress={() => {
              Keyboard.dismiss();
              setLocationModalVisible(true);
            }}
          >
            <Text style={styles.selectText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </AuthField>

        <AuthButton
          label="Continue"
          icon="arrow-forward"
          onPress={() => {
            void handleNext();
          }}
          disabled={checkingUsername}
          loading={checkingUsername}
        />
      </View>

      <AppPopup
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        title="Search location"
        subtitle="Choose a city, state, or country for your profile."
        align="bottom"
        animationType="slide"
        dismissOnBackdrop
        showCloseButton
        contentStyle={styles.locationPopup}
        bodyStyle={styles.locationBody}
      >
        {!MAPBOX_TOKEN ? (
          <Text style={styles.popupHint}>
            Missing Mapbox token. Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` to enable location search.
          </Text>
        ) : (
          <>
            <TextInput
              value={locationQuery}
              onChangeText={setLocationQuery}
              placeholder="City, state, or country"
              placeholderTextColor={colors.textMuted}
              style={styles.popupInput}
              autoFocus
            />

            {locationLoading ? (
              <Text style={styles.popupHint}>Searching…</Text>
            ) : (
              <FlatList
                data={locationResults}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={styles.resultsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultRow}
                    onPress={() => handleSelectLocation(item)}
                    activeOpacity={0.92}
                  >
                    <Text style={styles.resultTitle}>{item.text}</Text>
                    <Text style={styles.resultSubtitle} numberOfLines={2}>
                      {item.place_name}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.popupHint}>
                    {locationQuery.trim() ? 'No results found.' : 'Type to search.'}
                  </Text>
                }
              />
            )}
          </>
        )}
      </AppPopup>

      <AppAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={handleCloseAlert}
      />
    </AuthScreen>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts'],
  ui: ReturnType<typeof useAuthDesignSystem>
) {
  return StyleSheet.create({
    card: {
      ...ui.fragments.card,
    },
    input: {
      ...ui.fragments.input,
    },
    usernameRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    usernameInput: {
      flex: 1,
    },
    inlineButton: {
      minWidth: 96,
      minHeight: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ui.tones.accentStrong,
      paddingHorizontal: 16,
    },
    inlineButtonDisabled: {
      opacity: 0.62,
    },
    inlineButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    selectField: {
      minHeight: 56,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: ui.fragments.input.backgroundColor,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    selectText: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 20,
    },
    helperText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    helperValue: {
      color: colors.text,
      fontFamily: fonts.heading,
    },
    helperSuccess: {
      color: colors.success,
    },
    helperDanger: {
      color: colors.danger,
    },
    locationPopup: {
      maxHeight: '82%',
    },
    locationBody: {
      paddingTop: 10,
    },
    popupInput: {
      ...ui.fragments.inputDense,
    },
    popupHint: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      paddingVertical: 16,
    },
    resultsList: {
      marginTop: 12,
      maxHeight: 360,
    },
    resultRow: {
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderStrong,
    },
    resultTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    resultSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
  });
}
