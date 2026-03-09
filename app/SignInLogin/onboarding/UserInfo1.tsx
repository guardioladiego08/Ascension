import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import AppAlert from '../components/AppAlert';
import { useOnboardingDraftStore } from '@/lib/onboarding/onboardingDraftStore';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { withAlpha } from '@/constants/Colors';

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

export default function UserInfo1() {
  const router = useRouter();
  const { draft, setDraft } = useOnboardingDraftStore();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [firstName, setFirstName] = useState(draft.first_name ?? '');
  const [lastName, setLastName] = useState(draft.last_name ?? '');
  const [country, setCountry] = useState(draft.country ?? '');
  const [stateRegion, setStateRegion] = useState(draft.state ?? '');
  const [city, setCity] = useState(draft.city ?? '');

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

  const handleNext = () => {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert('Missing info', 'Please enter first name and last name.');
      return;
    }

    setDraft({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      country: country.trim() || null,
      state: stateRegion.trim() || null,
      city: city.trim() || null,
    });

    router.replace('/SignInLogin/onboarding/UserInfo2');
  };

  return (
    <AuthScreen
      eyebrow="Step 1 of 4"
      title="Your info"
      subtitle="Set the basics once so training, nutrition, and analytics have the right starting point."
    >
      <View style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Location</Text>
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
          <Text style={styles.helperText}>Optional. Used for local trends and relevant defaults.</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.92} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.blkText} />
        </TouchableOpacity>
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
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      borderRadius: 28,
      padding: 22,
      gap: 18,
      backgroundColor: withAlpha(colors.surface, 0.92),
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldGroup: {
      gap: 8,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 54,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 16,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 15,
    },
    selectField: {
      minHeight: 54,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
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
    primaryButton: {
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    locationPopup: {
      maxHeight: '82%',
    },
    locationBody: {
      paddingTop: 10,
    },
    popupInput: {
      minHeight: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 16,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 15,
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
