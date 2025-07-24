// app/(tabs)/new.tsx

import LogoHeader from '@/components/Header/LogoHeader';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WeighInScreen() {
  const router = useRouter();

  const [weight, setWeight] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [boneMass, setBoneMass] = useState<string>('');
  const [muscleMass, setMuscleMass] = useState<string>('');

  const handleSave = () => {
    // TODO: persist your values (e.g. send to your backend or context)
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <LogoHeader></LogoHeader>
        <Text style={styles.header}>WEIGH IN</Text>

        <View style={styles.form}>
          <Text style={styles.label}>WEIGHT</Text>
          <TextInput
            style={styles.input}
            placeholder="225.6 lbs"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />

          <Text style={styles.label}>BODY FAT</Text>
          <TextInput
            style={styles.input}
            placeholder="20.2 %"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={bodyFat}
            onChangeText={setBodyFat}
            keyboardType="numeric"
          />

          <Text style={styles.label}>BONE MASS</Text>
          <TextInput
            style={styles.input}
            placeholder="15.6 %"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={boneMass}
            onChangeText={setBoneMass}
            keyboardType="numeric"
          />

          <Text style={styles.label}>MUSCLE MASS</Text>
          <TextInput
            style={styles.input}
            placeholder="64.2 %"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={muscleMass}
            onChangeText={setMuscleMass}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.buttonText}>SAVE</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  inner: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  header: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  underline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.dark.highlight1,
    marginTop: 8,
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  label: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    color: Colors.dark.text,
    marginBottom: 24,
    backgroundColor: Colors.dark.cardBackground ?? Colors.dark.tab,
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.dark.highlight1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
