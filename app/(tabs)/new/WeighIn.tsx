// app/(tabs)/new/WeighIn.tsx
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import LogoHeader from '@/components/my components/logoHeader';

const WeighIn: React.FC = () => {
  const router = useRouter();

  const [weight, setWeight] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [boneMass, setBoneMass] = useState<string>('');
  const [muscleMass, setMuscleMass] = useState<string>('');

  const onSave = () => {
    // TODO: persist to your store / API here
    // e.g., saveWeighIn({ weight, bodyFat, boneMass, muscleMass })
    router.back(); // go back to previous screen after saving
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={{ color: 'white', fontSize: 40 }}>{'‹'}</Text>
            </TouchableOpacity> 
      </View>
      <LogoHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.title}>WEIGH IN</Text>

          {/* Weight */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>WEIGHT</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="225.6 lbs"
              placeholderTextColor="#CFCFCF"
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>

          {/* Body Fat */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>BODY FAT</Text>
            <TextInput
              style={styles.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder="20.2 %"
              placeholderTextColor="#CFCFCF"
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>

          {/* Bone Mass */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>BONE MASS</Text>
            <TextInput
              style={styles.input}
              value={boneMass}
              onChangeText={setBoneMass}
              placeholder="15.6 %"
              placeholderTextColor="#CFCFCF"
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>

          {/* Muscle Mass */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>MUSCLE MASS</Text>
            <TextInput
              style={styles.input}
              value={muscleMass}
              onChangeText={setMuscleMass}
              placeholder="64.2 %"
              placeholderTextColor="#CFCFCF"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={onSave}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity onPress={onSave} activeOpacity={0.9} style={styles.saveButton}>
            <Text style={styles.saveText}>SAVE</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default WeighIn;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
    alignSelf: 'center',
    marginVertical: 16,
  },
  fieldBlock: { marginBottom: 16 },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  saveButton: {
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: '#222222',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
