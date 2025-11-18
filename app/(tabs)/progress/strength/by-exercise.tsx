import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import LogoHeader from '@/components/my components/logoHeader';

type ExerciseRow = { id: string; exercise_name: string | null };

export default function ByExercise() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let on = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('id, exercise_name')
        .order('exercise_name', { ascending: true });
      if (!on) return;
      if (error) {
        console.error(error);
        setRows([]);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    })();
    return () => { on = false; };
  }, []);

  const filtered = rows.filter(r => (r.exercise_name || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />
      <View style={styles.container}>
        <Text style={styles.title}>Exercises</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor={Colors.dark.subText}
          style={styles.search}
        />

        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => router.push({ pathname: '/(tabs)/progress/strength/exercise/[id]', params: { id: item.id, name: item.exercise_name || '' } })}
              >
                <Text style={styles.itemText}>{item.exercise_name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { color: Colors.dark.text, fontSize: 20, fontWeight: '700' },
  search: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder ?? '#2A2A2A',
    color: Colors.dark.text,
  },
  item: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder ?? '#2A2A2A',
    backgroundColor: Colors.dark.card ?? '#1A1A1A',
    marginTop: 6,
  },
  itemText: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' },
});
