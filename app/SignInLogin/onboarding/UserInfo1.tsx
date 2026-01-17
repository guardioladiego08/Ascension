// app/SignInLogin/onboarding/UserInfo1.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  Keyboard,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import AppAlert from '../components/AppAlert';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;
const CARD = Colors.dark.popUpCard;

type Params = { authUserId?: string };

// ---- Mapbox types ----
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
  process.env.MAPBOX_ACCESS_TOKEN ||
  '';

export default function UserInfo1() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const authUserId = Array.isArray(params.authUserId)
    ? params.authUserId[0]
    : params.authUserId;

  // Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Location
  const [country, setCountry] = useState<string | null>(null);
  const [stateRegion, setStateRegion] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);

  const formattedLocation = useMemo(() => {
    const parts = [city, stateRegion, country].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }, [city, stateRegion, country]);

  // Location modal state
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<MapboxFeature[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Loading
  const [loading, setLoading] = useState(false);

  // Alert
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

  // ---- Load profile (prefill) ----
  useEffect(() => {
    const loadProfile = async () => {
      if (!authUserId) return;

      const { data, error } = await supabase
        .schema('public')
        .from('profiles')
        .select('first_name,last_name,country,state,city')
        .eq('id', authUserId)
        .maybeSingle();

      if (error) return;

      if (data?.first_name) setFirstName(data.first_name);
      if (data?.last_name) setLastName(data.last_name);

      if (data?.country) setCountry(data.country);
      if (data?.state) setStateRegion(data.state);
      if (data?.city) setCity(data.city);
    };

    loadProfile();
  }, [authUserId]);

  // ---- Mapbox autocomplete (debounced) ----
  useEffect(() => {
    if (!locationModalVisible) return;

    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);

    const q = locationQuery.trim();
    if (q.length < 2) {
      setLocationResults([]);
      setLocationLoading(false);
      return;
    }

    locationDebounceRef.current = setTimeout(async () => {
      if (!MAPBOX_TOKEN) {
        showAlert(
          'Missing Mapbox token',
          'Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN or EXPO_PUBLIC_MAPBOX_TOKEN in your environment to enable location autocomplete.',
        );
        return;
      }

      setLocationLoading(true);
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
          `?autocomplete=true&types=place,locality,region,country&limit=8&access_token=${MAPBOX_TOKEN}`;

        const res = await fetch(url);
        if (!res.ok) {
          setLocationResults([]);
          return;
        }

        const json = await res.json();
        const features: MapboxFeature[] = Array.isArray(json?.features) ? json.features : [];
        setLocationResults(features);
      } catch {
        setLocationResults([]);
      } finally {
        setLocationLoading(false);
      }
    }, 300);

    return () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    };
  }, [locationQuery, locationModalVisible]);

  const extractFromContext = (feature: MapboxFeature) => {
    const ctx = feature.context ?? [];
    const countryText = ctx.find((c) => c.id.startsWith('country.'))?.text ?? null;
    const regionText = ctx.find((c) => c.id.startsWith('region.'))?.text ?? null;
    return { countryText, regionText };
  };

  const applyLocationSelection = (feature: MapboxFeature) => {
    const types = feature.place_type ?? [];
    const { countryText, regionText } = extractFromContext(feature);

    if (types.includes('country')) {
      setCountry(feature.text || feature.place_name);
      setStateRegion(null);
      setCity(null);
    } else if (types.includes('region')) {
      setCountry(countryText);
      setStateRegion(feature.text || null);
      setCity(null);
    } else if (types.includes('place') || types.includes('locality')) {
      setCountry(countryText);
      setStateRegion(regionText);
      setCity(feature.text || null);
    } else {
      setCountry(countryText);
      setStateRegion(regionText);
      setCity(feature.text || null);
    }

    setLocationModalVisible(false);
    setLocationQuery('');
    setLocationResults([]);
  };

  // ---- Continue ----
  const handleContinue = async () => {
    if (!authUserId) {
      showAlert('Error', 'Missing auth user id.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      showAlert('Missing info', 'Please enter first name and last name.');
      return;
    }

    setLoading(true);

    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      display_name: displayName, // keep display_name in sync once real name exists
      country,
      state: stateRegion,
      city,
    };

    const { error } = await supabase
      .schema('public')
      .from('profiles')
      .update(payload)
      .eq('id', authUserId);

    setLoading(false);

    if (error) {
      console.log('[Profile Update] error:', error);
      showAlert('Error', 'Could not save your profile info. Please try again.');
      return;
    }

    router.replace({ pathname: './UserInfo2', params: { authUserId } });
  };

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <LogoHeader />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Info</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.stepText}>Step 1/5</Text>

        <View style={styles.card}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
          />

          <Text style={styles.label}>Last name</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
          />

          <Text style={styles.label}>Location (optional)</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.selectField}
            onPress={() => {
              Keyboard.dismiss();
              setLocationModalVisible(true);
            }}
          >
            <Text style={styles.selectFieldText}>
              {formattedLocation ?? 'Search city, state, or country'}
            </Text>
            <Ionicons name="search" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>

          {(country || stateRegion || city) && (
            <TouchableOpacity
              style={styles.clearLocation}
              onPress={() => {
                setCountry(null);
                setStateRegion(null);
                setCity(null);
              }}
            >
              <Text style={styles.clearLocationText}>Clear location</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#020817" />
            ) : (
              <Text style={styles.primaryText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Location Search Modal */}
        <Modal
          visible={locationModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLocationModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setLocationModalVisible(false)}>
            <Pressable style={styles.locationModalCard} onPress={() => {}}>
              <View style={styles.locationHeaderRow}>
                <Text style={styles.modalTitle}>Search location</Text>
                <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                  <Ionicons name="close" size={22} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchRow}>
                <Ionicons name="search" size={18} color={TEXT_MUTED} />
                <TextInput
                  value={locationQuery}
                  onChangeText={setLocationQuery}
                  placeholder="Type a city, state, or country..."
                  placeholderTextColor={TEXT_MUTED}
                  autoFocus
                  style={styles.searchInput}
                />
                {locationQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setLocationQuery('');
                      setLocationResults([]);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
                  </TouchableOpacity>
                )}
              </View>

              {locationLoading ? (
                <View style={{ paddingVertical: 14 }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <FlatList
                  data={locationResults}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.resultRow}
                      onPress={() => applyLocationSelection(item)}
                    >
                      <Text style={styles.resultTitle}>{item.text}</Text>
                      <Text style={styles.resultSub}>{item.place_name}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    locationQuery.trim().length >= 2 ? (
                      <Text style={styles.emptyText}>No results.</Text>
                    ) : (
                      <Text style={styles.emptyText}>Type at least 2 characters.</Text>
                    )
                  }
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <AppAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          onClose={handleCloseAlert}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  stepText: {
    textAlign: 'center',
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: -6,
  },

  card: { borderRadius: 18, padding: 18, marginTop: 16 },

  label: { fontSize: 13, color: TEXT_PRIMARY, marginTop: 10, marginBottom: 4 },

  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7b7b7bff',
    backgroundColor: '#b0b0b050',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 15,
  },

  primaryButton: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: PRIMARY, fontWeight: '600', fontSize: 15 },

  selectField: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7b7b7bff',
    backgroundColor: '#b0b0b050',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    flexShrink: 1,
    paddingRight: 10,
  },
  clearLocation: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearLocationText: {
    color: TEXT_MUTED,
    fontSize: 12,
    textDecorationLine: 'underline',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  locationModalCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#1F2937',
    maxHeight: '75%',
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7b7b7bff',
    backgroundColor: '#b0b0b050',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    paddingVertical: 0,
  },
  resultRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  resultTitle: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
  resultSub: { color: TEXT_MUTED, fontSize: 12, marginTop: 2 },
  emptyText: { color: TEXT_MUTED, fontSize: 12, paddingVertical: 10 },
});
