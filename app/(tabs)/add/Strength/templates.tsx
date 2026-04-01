import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import LogoHeader from '@/components/my components/logoHeader';
import {
  fetchStrengthWorkoutTemplates,
  type StrengthWorkoutTemplate,
} from '@/lib/strength/templates';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

import StrengthTemplateCard from './components/StrengthTemplateCard';

export default function StrengthTemplatesScreen() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [templates, setTemplates] = useState<StrengthWorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTemplates = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setErrorMessage(null);
      setTemplates(await fetchStrengthWorkoutTemplates());
    } catch (error: any) {
      console.warn('[StrengthTemplates] load failed', error);
      setErrorMessage(
        error?.message ?? 'Something went wrong while loading your workout templates.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadTemplates();
    }, [loadTemplates])
  );

  return (
    <View style={globalStyles.page}>
      <View style={[globalStyles.container, styles.screen]}>
        <LogoHeader showBackButton backTo="/(tabs)/home" />

        <View style={[globalStyles.panel, styles.heroCard]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={globalStyles.eyebrow}>Strength templates</Text>
              <Text style={styles.heroTitle}>Start from a saved structure</Text>
              <Text style={styles.heroSubtitle}>
                Templates preload exercise order and set counts. Today’s weight and rep fields still
                use your latest logged performance as muted placeholders.
              </Text>
            </View>

            <View style={styles.heroIconWrap}>
              <Ionicons name="copy-outline" size={22} color={colors.highlight1} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{templates.length}</Text>
              <Text style={styles.heroStatLabel}>saved templates</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {templates.reduce((sum, template) => sum + template.totalExercises, 0)}
              </Text>
              <Text style={styles.heroStatLabel}>saved exercises</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={colors.highlight1} />
            <Text style={styles.stateText}>Loading your saved templates…</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateCard}>
            <Text style={[styles.stateText, styles.stateTextError]}>{errorMessage}</Text>
            <TouchableOpacity
              activeOpacity={0.92}
              style={[globalStyles.buttonSecondary, styles.retryButton]}
              onPress={() => void loadTemplates()}
            >
              <Text style={globalStyles.buttonTextSecondary}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                tintColor={colors.highlight1}
                refreshing={refreshing}
                onRefresh={() => void loadTemplates('refresh')}
              />
            }
          >
            {templates.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="barbell-outline" size={20} color={colors.highlight1} />
                </View>
                <Text style={styles.emptyTitle}>No templates saved yet</Text>
                <Text style={styles.emptyText}>
                  Finish a freestyle strength workout and save it as a template to reuse the same
                  exercise order and set counts here.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={[globalStyles.buttonPrimary, styles.emptyButton]}
                  onPress={() =>
                    router.push({
                      pathname: '/add/Strength/StrengthTrain',
                      params: { sessionMode: 'freestyle' },
                    })
                  }
                >
                  <Text style={globalStyles.buttonTextPrimary}>Start freestyle</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.list}>
                {templates.map((template) => (
                  <StrengthTemplateCard
                    key={template.id}
                    template={template}
                    onPress={() =>
                      router.push({
                        pathname: '/add/Strength/StrengthTrain',
                        params: {
                          sessionMode: 'template',
                          templateId: template.id,
                        },
                      })
                    }
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingBottom: 0,
    },
    heroCard: {
      gap: 18,
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      marginTop: 8,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.8,
    },
    heroSubtitle: {
      marginTop: 10,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    heroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroStatsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    heroStat: {
      flex: 1,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 16,
      gap: 6,
    },
    heroStatValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.mono,
      fontSize: 24,
      lineHeight: 28,
      fontVariant: ['tabular-nums'],
    },
    heroStatLabel: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    scroll: {
      flex: 1,
      marginTop: 14,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    list: {
      gap: 12,
    },
    stateCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 28,
    },
    stateText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    stateTextError: {
      color: colors.warning,
    },
    retryButton: {
      marginTop: 4,
      minWidth: 132,
    },
    emptyCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      alignItems: 'center',
      paddingVertical: 30,
      paddingHorizontal: 20,
    },
    emptyIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
    },
    emptyText: {
      marginTop: 10,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 320,
    },
    emptyButton: {
      marginTop: 18,
      minWidth: 180,
    },
  });
}
