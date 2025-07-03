import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React from 'react';

export default function NotFoundScreen() {
  return (
    <>
      {/* Set the native screen title */}
      <Stack.Screen options={{ title: 'Oops!' }} />

      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          This screen does not exist.
        </ThemedText>

        {/* `asChild` lets the Link delegate press-handling
            to the ThemedText, so we don’t end up with
            <Text> inside another <Text>. */}
        <Link href="/(tabs)/stats" asChild>
          <ThemedText type="link" style={styles.link}>
            Go to home screen!
          </ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
