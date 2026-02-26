// app/(tabs)/social/search.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { getMyUserId, searchProfiles, type PublicProfile } from '@/lib/social/api';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted ?? '#9AA4BF';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name.slice(0, 2) || '').toUpperCase();
}

export default function PeopleSearchScreen() {
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const debounceRef = useRef<any>(null);

  useEffect(() => {
    getMyUserId().then(setMeId).catch(() => setMeId(null));
  }, []);

  const runSearch = useCallback(async (q: string) => {
    try {
      setLoading(true);
      setErrorText(null);
      const data = await searchProfiles(q, 25);
      const filtered = meId ? data.filter((p) => p.id !== meId) : data;


      setRows(filtered);
    } catch (e: any) {
      setErrorText(e?.message ?? 'Search failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [meId]);

  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q) {
      setRows([]);
      setErrorText(null);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(q), 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const headerHint = useMemo(() => {
    if (!query.trim()) return 'Search by username';
    return loading ? 'Searching…' : `${rows.length} result(s)`;
  }, [query, rows.length, loading]);

  return (
    <View style={styles.safe}>
      <LinearGradient colors={[BG, '#070B12']} style={styles.bg}>
        <LogoHeader />

        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.title}>Search People</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={TEXT_MUTED} style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search"
            placeholderTextColor={TEXT_MUTED}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} activeOpacity={0.85}>
              <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.hint}>{headerHint}</Text>

        {errorText ? (
          <View style={styles.stateWrap}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : loading && rows.length === 0 ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              
              <TouchableOpacity
                style={styles.userCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({ pathname: '/social/[userId]', params: { userId: item.id } })
                }
                
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.display_name || item.username)}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.username}>@{item.username}</Text>
                  <Text style={styles.displayName}>{item.display_name}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            )}
          />
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  bg: { flex: 1 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  iconBtn: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { color: TEXT, fontSize: 16, fontWeight: '900' },

  searchBox: {
    marginHorizontal: 16,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 14, fontWeight: '700' },
  clearBtn: { paddingLeft: 8, paddingVertical: 6 },

  hint: { marginHorizontal: 16, marginTop: 10, marginBottom: 10, color: TEXT_MUTED, fontSize: 12, fontWeight: '600' },

  stateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#FCA5A5', fontSize: 13, paddingHorizontal: 16, textAlign: 'center' },

  userCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  avatarText: { color: TEXT, fontWeight: '900', fontSize: 13, letterSpacing: 0.4 },
  username: { color: TEXT, fontSize: 13.5, fontWeight: '900' },
  displayName: { color: TEXT_MUTED, fontSize: 12.25, fontWeight: '600', marginTop: 2 },
});
