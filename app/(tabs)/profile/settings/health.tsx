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
import { useAppTheme } from '@/providers/AppThemeProvider';

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
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
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
          <Ionicons name="chevron-back" size={22} color={colors.text} />
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
            <Ionicons name="heart-outline" size={18} color={colors.highlight1} />
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
              <ActivityIndicator size="small" color={colors.highlight1} />
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
                  <Ionicons name="warning-outline" size={16} color={colors.warning} />
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

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
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
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    headerSpacer: {
      width: 32,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      gap: 10,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    heroBadgeText: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 15,
      letterSpacing: 0.5,
    },
    heroTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 27,
    },
    heroBody: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
    },
    heroFootnote: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    statLabel: {
      flex: 1,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    statValue: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'right',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colors.glowSecondary,
      borderRadius: 14,
      padding: 12,
    },
    errorText: {
      flex: 1,
      color: colors.warning,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    loadErrorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    cardCopy: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 21,
    },
    actionWrap: {
      gap: 12,
    },
    primaryButton: {
      borderRadius: 16,
      backgroundColor: colors.highlight1,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    secondaryButtonText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    linkButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    linkButtonText: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
  });
}
