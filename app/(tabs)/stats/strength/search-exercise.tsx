import React from 'react';
import { SafeAreaView, Text, StyleSheet, View } from 'react-native';
import LogoHeader from '@/components/my components/logoHeader';

const SearchExercise: React.FC = () => {
  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader />
      <Text style={styles.title}>SEARCH EXERCISE</Text>
      <View style={styles.box}>
        <Text style={styles.hint}>
          Search UI coming next. We’ll add filters, suggestions, and a results list here.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#3f3f3f', paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginVertical: 8 },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
  },
  hint: { color: '#CFCFCF', fontSize: 13 },
});

export default SearchExercise;
