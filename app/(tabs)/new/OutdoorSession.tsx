import React from 'react';
import { SafeAreaView, Text, View, StyleSheet } from 'react-native';
import OutdoorMap from '@/components/my components/cardio/OutdoorMap';
import { useLocalSearchParams } from 'expo-router';
import LogoHeader from '@/components/my components/logoHeader';

export default function SessionMap() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader />
      <Text style={styles.title}>{name ?? 'Outdoor Session'}</Text>
      <View style={{ flex: 1 }}>
        <OutdoorMap sessionId={id} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#121212',
  },
  title: {
    color: '#FF950A',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
});
