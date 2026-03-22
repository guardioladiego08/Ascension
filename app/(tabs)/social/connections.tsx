import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import LogoHeader from '@/components/my components/logoHeader';
import { listFollowers, listFollowing, type ConnectionProfile } from '@/lib/social/api';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Tab = 'followers' | 'following';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '').toUpperCase();
}

export default function ConnectionsScreen() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const params = useLocalSearchParams<{
    userId?: string | string[];
    tab?: string | string[];
    username?: string | string[];
  }>();

  const userId =
    typeof params.userId === 'string'
      ? params.userId
      : Array.isArray(params.userId)
        ? params.userId[0] ?? ''
        : '';

  const usernameParam =
    typeof params.username === 'string'
      ? params.username
      : Array.isArray(params.username)
        ? params.username[0] ?? ''
        : '';

  const initialTab: Tab =
    (typeof params.tab === 'string' ? params.tab : Array.isArray(params.tab) ? params.tab[0] : '') === 'following'
      ? 'following'
      : 'followers';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [rows, setRows] = useState<ConnectionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const title = useMemo(() => {
    if (usernameParam) return `@${usernameParam}`;
    return 'Connections';
  }, [usernameParam]);

  const loadRows = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setErrorText('Missing user id');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setErrorText(null);
      const data =
        activeTab === 'followers'
          ? await listFollowers(userId, 200, 0)
          : await listFollowing(userId, 200, 0);
      setRows(data);
    } catch (err: any) {
      setRows([]);
      setErrorText(err?.message ?? 'Could not load list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, userId]);

  useEffect(() => {
    setLoading(true);
    loadRows();
  }, [loadRows]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRows();
  }, [loadRows]);

  return (
    <View style={styles.safe}>
      <View style={globalStyles.page}>
        <LogoHeader />

        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{activeTab === 'followers' ? 'Followers' : 'Following'}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.switchWrap}>
          <TabPill label="Followers" active={activeTab === 'followers'} onPress={() => setActiveTab('followers')} />
          <TabPill label="Following" active={activeTab === 'following'} onPress={() => setActiveTab('following')} />
        </View>

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="small" color={colors.highlight1} />
            <Text style={styles.stateText}>Loading {activeTab}…</Text>
          </View>
        ) : errorText ? (
          <View style={styles.stateWrap}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshing={refreshing}
            onRefresh={onRefresh}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/social/[userId]', params: { userId: item.id } })}
              >
                {item.profile_image_url ? (
                  <Image source={{ uri: item.profile_image_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initials(item.display_name || item.username)}</Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.username}>@{item.username}</Text>
                  <Text style={styles.displayName}>{item.display_name}</Text>
                </View>

                {item.is_private ? (
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                ) : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.stateWrap}>
                <Text style={styles.stateText}>No {activeTab} yet.</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.tabPill, active && styles.tabPillActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 10,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 18,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
    },
    switchWrap: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    tabPill: {
      flex: 1,
      height: 38,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabPillActive: {
      borderColor: colors.highlight1,
      backgroundColor: colors.accentSoft,
    },
    tabText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 13,
      lineHeight: 16,
    },
    tabTextActive: {
      color: colors.highlight1,
    },
    stateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      gap: 10,
    },
    stateText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
      textAlign: 'center',
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
      textAlign: 'center',
    },
    userCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarImage: {
      width: 40,
      height: 40,
      borderRadius: 999,
    },
    avatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card2,
    },
    avatarText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
    username: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13.5,
      lineHeight: 17,
    },
    displayName: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12.25,
      lineHeight: 16,
      marginTop: 2,
    },
  });
}
