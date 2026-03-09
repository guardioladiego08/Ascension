import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import {
  getHealthProviderDescriptor,
} from '@/lib/health/copy';
import {
  getHealthPreferences,
  getHealthStatusLabel,
  type HealthPreferences,
  updateHealthPreferences,
} from '@/lib/health/preferences';
import {
  getCurrentHealthProviderId,
  getCurrentHealthProviderUnavailableMessage,
  isCurrentHealthProviderAvailable,
  openCurrentHealthProviderSettings,
  requestCurrentHeartRateAuthorization,
} from '@/lib/health/provider';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.text ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark?.highlight1 ?? '#6366F1';

const DEFAULT_PREFS: HealthPreferences = {
  providerId: getCurrentHealthProviderId(),
  syncEnabled: false,
  authorizationStatus: 'not_determined',
  lastConnectedAt: null,
  lastSyncAt: null,
  lastError: null,
};

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export default function HealthDataSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<HealthPreferences>(DEFAULT_PREFS);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);

  const providerId = prefs.providerId ?? getCurrentHealthProviderId();
  const provider = getHealthProviderDescriptor(providerId);

  const loadPrefs = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);
      const [nextPrefs, available] = await Promise.all([
        getHealthPreferences(),
        isCurrentHealthProviderAvailable(),
      ]);
      console.log('[HealthDebug] loaded health preferences', nextPrefs);
      setPrefs(nextPrefs);
      setNativeAvailable(available);
    } catch (error: any) {
      console.warn('[HealthSettings] load failed', error);
      setErrorText(error?.message ?? 'Failed to load health data settings.');
      setPrefs(DEFAULT_PREFS);
      setNativeAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPrefs();
    }, [loadPrefs])
  );

  const statusLabel = useMemo(() => getHealthStatusLabel(prefs), [prefs]);

  const refreshWithPatch = async (patch: Partial<HealthPreferences>) => {
    const nextPrefs = await updateHealthPreferences({
      providerId: getCurrentHealthProviderId(),
      ...patch,
    });
    setPrefs(nextPrefs);
  };

  const handleConnect = async () => {
    if (!nativeAvailable) {
      const message = await getCurrentHealthProviderUnavailableMessage();
      console.log('[HealthDebug] connect tapped but native unavailable', { message });

      try {
        await refreshWithPatch({
          providerId: getCurrentHealthProviderId(),
          syncEnabled: false,
          authorizationStatus: 'unavailable',
          lastError: message,
        });
      } catch (error) {
        console.warn('[HealthSettings] unable to persist unavailable status', error);
      }

      Alert.alert(`${provider.providerLabel} unavailable`, message);
      return;
    }

    try {
      setSaving(true);
      console.log('[HealthDebug] connect tapped, requesting authorization');
      const result = await requestCurrentHeartRateAuthorization();
      console.log('[HealthDebug] authorization result', result);

      if (result.status === 'authorized') {
        await refreshWithPatch({
          providerId: getCurrentHealthProviderId(),
          syncEnabled: true,
          authorizationStatus: 'authorized',
          lastConnectedAt: new Date().toISOString(),
          lastError: null,
        });

        Alert.alert(
          `${provider.providerLabel} connected`,
          'Heart-rate samples will be available for completed workouts and cardio sessions.'
        );
        return;
      }

      await refreshWithPatch({
        providerId: getCurrentHealthProviderId(),
        syncEnabled: false,
        authorizationStatus: result.status,
        lastError: result.error,
      });

      console.log('[HealthDebug] saved unsuccessful authorization state', {
        authorizationStatus: result.status,
        error: result.error,
      });

      Alert.alert(
        result.status === 'denied' ? 'Permission denied' : `${provider.providerLabel} unavailable`,
        result.error ?? `${provider.providerLabel} access was not granted.`
      );
    } catch (error: any) {
      console.warn('[HealthSettings] connect failed', error);
      Alert.alert('Connection failed', error?.message ?? `Could not connect ${provider.providerLabel}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDisableSync = async () => {
    try {
      setSaving(true);
      await refreshWithPatch({
        providerId: getCurrentHealthProviderId(),
        syncEnabled: false,
        lastError: null,
      });
    } catch (error: any) {
      console.warn('[HealthSettings] disable failed', error);
      Alert.alert('Update failed', error?.message ?? 'Could not turn off heart-rate sync.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableSync = async () => {
    try {
      setSaving(true);
      await refreshWithPatch({
        providerId: getCurrentHealthProviderId(),
        syncEnabled: true,
        lastError: null,
      });
    } catch (error: any) {
      console.warn('[HealthSettings] enable failed', error);
      Alert.alert('Update failed', error?.message ?? 'Could not turn on heart-rate sync.');
    } finally {
      setSaving(false);
    }
  };

  const lastConnected = formatDateTime(prefs.lastConnectedAt);
  const lastSync = formatDateTime(prefs.lastSyncAt);

  const handleOpenProviderSettings = async () => {
    try {
      await openCurrentHealthProviderSettings();
    } catch {
      Alert.alert(
        'Unable to open settings',
        providerId === 'apple_health'
          ? 'Open the iPhone Settings app manually to manage Apple Health permission.'
          : 'Open the Health Connect app or Google Play manually to manage Health Connect access.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health data</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="heart-outline" size={18} color={ACCENT} />
            <Text style={styles.heroBadgeText}>Heart Rate Provider</Text>
          </View>
          <Text style={styles.heroTitle}>{provider.connectTitle}</Text>
          <Text style={styles.heroBody}>{provider.connectBody}</Text>
          <Text style={styles.heroFootnote}>{provider.connectFootnote}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={styles.loadingText}>Loading health provider status…</Text>
            </View>
          ) : (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Provider</Text>
                <Text style={styles.statValue}>{provider.providerLabel}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Connection</Text>
                <Text style={styles.statValue}>{statusLabel}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Native support</Text>
                <Text style={styles.statValue}>
                  {nativeAvailable ? 'Available in this build' : 'Not installed in this build'}
                </Text>
              </View>
              {lastConnected ? (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Last connected</Text>
                  <Text style={styles.statValue}>{lastConnected}</Text>
                </View>
              ) : null}
              {lastSync ? (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Last sync</Text>
                  <Text style={styles.statValue}>{lastSync}</Text>
                </View>
              ) : null}
              {prefs.lastError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                  <Text style={styles.errorText}>{prefs.lastError}</Text>
                </View>
              ) : null}
              {errorText ? (
                <Text style={styles.loadErrorText}>{errorText}</Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What Ascension does</Text>
          <Text style={styles.cardCopy}>
            After you finish a workout, Ascension uses that session&apos;s start and end time to
            request matching heart-rate samples from {provider.providerLabel}.
          </Text>
          <Text style={styles.cardCopy}>
            Raw heart-rate samples are stored in a dedicated table and linked back to the finished
            session when they are saved to your account.
          </Text>
          <Text style={styles.cardCopy}>{provider.manageCopy}</Text>
        </View>

        <View style={styles.actionWrap}>
          {prefs.authorizationStatus === 'authorized' ? (
            prefs.syncEnabled ? (
              <TouchableOpacity
                style={[styles.primaryButton, styles.secondaryButton, saving && styles.buttonDisabled]}
                disabled={saving}
                onPress={handleDisableSync}
              >
                <Text style={styles.secondaryButtonText}>
                  {saving ? 'Updating…' : 'Turn Off Heart Rate Sync'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.buttonDisabled]}
                disabled={saving}
                onPress={handleEnableSync}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Updating…' : 'Turn On Heart Rate Sync'}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              disabled={saving}
              onPress={nativeAvailable === false ? handleOpenProviderSettings : handleConnect}
            >
              <Text style={styles.primaryButtonText}>
                {saving
                  ? 'Connecting…'
                  : nativeAvailable === false
                    ? provider.unavailableButtonLabel
                    : provider.connectTitle}
              </Text>
            </TouchableOpacity>
          )}

          {(prefs.authorizationStatus === 'denied' ||
            prefs.authorizationStatus === 'authorized' ||
            nativeAvailable === false) && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleOpenProviderSettings}
            >
              <Text style={styles.linkButtonText}>
                {nativeAvailable === false
                  ? provider.unavailableButtonLabel
                  : provider.settingsButtonLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 32,
  },
  heroCard: {
    backgroundColor: '#0E151F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '700',
  },
  heroBody: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 22,
  },
  heroFootnote: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statLabel: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 14,
  },
  statValue: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    textAlign: 'right',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 14,
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: '#FCD34D',
    fontSize: 13,
    lineHeight: 18,
  },
  loadErrorText: {
    color: '#F87171',
    fontSize: 13,
  },
  cardCopy: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 21,
  },
  actionWrap: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: ACCENT,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#081018',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  linkButtonText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
  },
});
