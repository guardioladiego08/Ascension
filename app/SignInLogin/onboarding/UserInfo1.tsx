// app/SignInLogin/onboarding/UserInfo1.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Keyboard,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import AppAlert from '../components/AppAlert';

import { useOnboardingDraftStore } from '@/lib/onboarding/onboardingDraftStore';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;
const CARD = Colors.dark.popUpCard;

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
  process.env.MAPBOX_ACCESS_TOKEN;

function safeString(v: any) {
  return typeof v === 'string' ? v : '';
}

export default function UserInfo1() {
  const router = useRouter();
  const { draft, setDraft } = useOnboardingDraftStore();

  const [firstName, setFirstName] = useState(draft.first_name ?? '');
  const [lastName, setLastName] = useState(draft.last_name ?? '');

  // location picker (optional)
  const [country, setCountry] = useState(draft.country ?? '');
  const [stateRegion, setStateRegion] = useState(draft.state ?? '');
  const [city, setCity] = useState(draft.city ?? '');

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<MapboxFeature[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationDebounceRef = useRef<any>(null);

  // Alerts
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
    return parts.length ? parts.join(', ') : 'Select (optional)';
  }, [city, stateRegion, country]);

  useEffect(() => {
    if (!locationModalVisible) return;
    if (!MAPBOX_TOKEN) return;

    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(async () => {
      const q = locationQuery.trim();
      if (!q) {
        setLocationResults([]);
        return;
      }

      setLocationLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          q
        )}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&types=place,locality,region,country&limit=8`;

        const res = await fetch(url);
        const json = await res.json();

        const feats = Array.isArray(json?.features) ? (json.features as MapboxFeature[]) : [];
        setLocationResults(feats);
      } catch (e) {
        setLocationResults([]);
      } finally {
        setLocationLoading(false);
      }
    }, 350);

    return () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    };
  }, [locationQuery, locationModalVisible]);

  const parseContext = (feature: MapboxFeature) => {
    const ctx = feature.context ?? [];
    const countryCtx = ctx.find((c) => c.id?.startsWith('country'))?.text ?? '';
    const regionCtx = ctx.find((c) => c.id?.startsWith('region'))?.text ?? '';
    const placeType = feature.place_type ?? [];

    // If feature is a country, it won't have countryCtx; use feature.text
    const isCountry = placeType.includes('country');
    const isRegion = placeType.includes('region');
    const isPlace = placeType.includes('place') || placeType.includes('locality');

    const nextCountry = isCountry ? feature.text : countryCtx;
    const nextState = isRegion ? feature.text : regionCtx;
    const nextCity = isPlace ? feature.text : '';

    return {
      country: nextCountry || '',
      state: nextState || '',
      city: nextCity || '',
    };
  };

  const handleSelectLocation = (feat: MapboxFeature) => {
    const parsed = parseContext(feat);
    setCountry(parsed.country);
    setStateRegion(parsed.state);
    setCity(parsed.city);
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

    router.replace('./UserInfo2');
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

        <Text style={styles.stepText}>Step 1/4</Text>

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
            <Text style={styles.selectText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#0b0f18" />
          </TouchableOpacity>
        </View>

        {/* Location Modal */}
        <Modal
          visible={locationModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setLocationModalVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setLocationModalVisible(false)} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search location</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close" size={22} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {!MAPBOX_TOKEN ? (
              <Text style={styles.modalHint}>
                Missing Mapbox token. Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to enable location search.
              </Text>
            ) : (
              <>
                <TextInput
                  value={locationQuery}
                  onChangeText={setLocationQuery}
                  placeholder="City, state, or country"
                  placeholderTextColor={TEXT_MUTED}
                  style={styles.modalInput}
                  autoFocus
                />

                {locationLoading ? (
                  <Text style={styles.modalHint}>Searching…</Text>
                ) : (
                  <FlatList
                    data={locationResults}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.resultRow}
                        onPress={() => handleSelectLocation(item)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.resultTitle}>{item.text}</Text>
                        <Text style={styles.resultSub} numberOfLines={2}>
                          {item.place_name}
                        </Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      locationQuery.trim() ? (
                        <Text style={styles.modalHint}>No results</Text>
                      ) : (
                        <Text style={styles.modalHint}>Type to search</Text>
                      )
                    }
                  />
                )}
              </>
            )}
          </View>
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
  container: { flex: 1, paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 54 : 38 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  headerTitle: { color: TEXT_PRIMARY, fontSize: 26, fontWeight: '700' },
  stepText: { color: TEXT_MUTED, marginTop: 8, marginBottom: 12 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 16 },
  label: { color: TEXT_MUTED, fontSize: 13, marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: TEXT_PRIMARY,
  },
  selectField: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { color: TEXT_PRIMARY, flex: 1, marginRight: 10 },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#0b0f18', fontWeight: '800', fontSize: 15 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: Platform.OS === 'ios' ? 90 : 60,
    maxHeight: '72%',
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '800' },
  modalHint: { color: TEXT_MUTED, marginTop: 12, textAlign: 'center' },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },
  resultRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  resultTitle: { color: TEXT_PRIMARY, fontWeight: '700' },
  resultSub: { color: TEXT_MUTED, marginTop: 2, fontSize: 12 },
});