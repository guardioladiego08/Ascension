import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  APPLE_HEALTH_PERMISSION_BODY,
  APPLE_HEALTH_PERMISSION_FOOTNOTE,
  APPLE_HEALTH_PERMISSION_MANAGE_COPY,
  APPLE_HEALTH_PERMISSION_TITLE,
} from '@/lib/health/copy';
import {
  getAppleHealthUnavailableMessage,
  isAppleHealthKitAvailable,
  requestAppleHeartRateAuthorization,
} from '@/lib/health/appleHealthKit';
import {
  getAppleHealthPreferences,
  getAppleHealthStatusLabel,
  type AppleHealthPreferences,
  updateAppleHealthPreferences,
} from '@/lib/health/preferences';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.text ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark?.highlight1 ?? '#6366F1';

const DEFAULT_PREFS: AppleHealthPreferences = {
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

export default function AppleHealthSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<AppleHealthPreferences>(DEFAULT_PREFS);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadPrefs = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);
      const nextPrefs = await getAppleHealthPreferences();
      console.log('[HealthDebug] loaded Apple Health preferences', nextPrefs);
      setPrefs(nextPrefs);
    } catch (error: any) {
      console.warn('[AppleHealthSettings] load failed', error);
      setErrorText(error?.message ?? 'Failed to load Apple Health settings.');
      setPrefs(DEFAULT_PREFS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPrefs();
    }, [loadPrefs])
  );

  const statusLabel = useMemo(() => getAppleHealthStatusLabel(prefs), [prefs]);
  const nativeAvailable = isAppleHealthKitAvailable();

  const refreshWithPatch = async (patch: Partial<AppleHealthPreferences>) => {
    const nextPrefs = await updateAppleHealthPreferences(patch);
    setPrefs(nextPrefs);
  };

  const handleConnect = async () => {
    if (!nativeAvailable) {
      const message = getAppleHealthUnavailableMessage();
      console.log('[HealthDebug] connect tapped but native unavailable', { message });

      try {
        await refreshWithPatch({
          syncEnabled: false,
          authorizationStatus: 'unavailable',
          lastError: message,
        });
      } catch (error) {
        console.warn('[AppleHealthSettings] unable to persist unavailable status', error);
      }

      Alert.alert('Apple Health unavailable', message);
      return;
    }

    try {
      setSaving(true);
      console.log('[HealthDebug] connect tapped, requesting authorization');
      const result = await requestAppleHeartRateAuthorization();
      console.log('[HealthDebug] authorization result', result);

      if (result.status === 'authorized') {
        await refreshWithPatch({
          syncEnabled: true,
          authorizationStatus: 'authorized',
          lastConnectedAt: new Date().toISOString(),
          lastError: null,
        });

        Alert.alert(
          'Apple Health connected',
          'Heart-rate samples will be imported after each completed strength workout.'
        );
        return;
      }

      await refreshWithPatch({
        syncEnabled: false,
        authorizationStatus: result.status,
        lastError: result.error,
      });

      console.log('[HealthDebug] saved unsuccessful authorization state', {
        authorizationStatus: result.status,
        error: result.error,
      });

      Alert.alert(
        result.status === 'denied' ? 'Permission denied' : 'Apple Health unavailable',
        result.error ?? 'Apple Health access was not granted.'
      );
    } catch (error: any) {
      console.warn('[AppleHealthSettings] connect failed', error);
      Alert.alert('Connection failed', error?.message ?? 'Could not connect Apple Health.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableSync = async () => {
    try {
      setSaving(true);
      await refreshWithPatch({
        syncEnabled: false,
        lastError: null,
      });
    } catch (error: any) {
      console.warn('[AppleHealthSettings] disable failed', error);
      Alert.alert('Update failed', error?.message ?? 'Could not turn off Apple Health sync.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableSync = async () => {
    try {
      setSaving(true);
      await refreshWithPatch({
        syncEnabled: true,
        lastError: null,
      });
    } catch (error: any) {
      console.warn('[AppleHealthSettings] enable failed', error);
      Alert.alert('Update failed', error?.message ?? 'Could not turn on Apple Health sync.');
    } finally {
      setSaving(false);
    }
  };

  const lastConnected = formatDateTime(prefs.lastConnectedAt);
  const lastSync = formatDateTime(prefs.lastSyncAt);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apple Health</Text>
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
            <Text style={styles.heroBadgeText}>Strength Heart Rate</Text>
          </View>
          <Text style={styles.heroTitle}>{APPLE_HEALTH_PERMISSION_TITLE}</Text>
          <Text style={styles.heroBody}>{APPLE_HEALTH_PERMISSION_BODY}</Text>
          <Text style={styles.heroFootnote}>{APPLE_HEALTH_PERMISSION_FOOTNOTE}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={styles.loadingText}>Loading Apple Health status…</Text>
            </View>
          ) : (
            <>
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
            After you finish a strength workout, Ascension uses that workout&apos;s start and end
            time to request Apple Watch heart-rate samples from Apple Health.
          </Text>
          <Text style={styles.cardCopy}>
            Raw heart-rate samples are stored in a dedicated table and linked back to the finished
            strength session.
          </Text>
          <Text style={styles.cardCopy}>{APPLE_HEALTH_PERMISSION_MANAGE_COPY}</Text>
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
              onPress={handleConnect}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Connecting…' : 'Connect Apple Health'}
              </Text>
            </TouchableOpacity>
          )}

          {(prefs.authorizationStatus === 'denied' || prefs.authorizationStatus === 'authorized') && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                Linking.openSettings().catch(() => {
                  Alert.alert(
                    'Unable to open settings',
                    'Open the iPhone Settings app manually to manage Apple Health permission.'
                  );
                });
              }}
            >
              <Text style={styles.linkButtonText}>Open iPhone Settings</Text>
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
