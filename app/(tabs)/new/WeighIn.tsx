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
import { GlobalStyles } from '@/constants/GlobalStyles';
import { supabase } from '@/lib/supabase'; // make sure you have this

const WeighIn: React.FC = () => {
  const router = useRouter();

  const [weight, setWeight] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [boneMass, setBoneMass] = useState<string>('');
  const [muscleMass, setMuscleMass] = useState<string>('');

  
  const onSave = async () => {
    try {
      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('You must be signed in to save a weigh-in.');
        return;
      }

      const { error } = await supabase.from('body_comp').insert([
        {
          user_id: user.id,
          weight: weight ? parseFloat(weight) : null,
          body_fat: bodyFat ? parseFloat(bodyFat) : null,
          bone_mass: boneMass ? parseFloat(boneMass) : null,
          muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
        },
      ]);

      if (error) {
        console.error('Error saving weigh-in:', error.message);
        alert('Could not save weigh-in.');
      } else {
        alert('Weigh-in saved!');
        router.back(); // go back after save
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error.');
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <LogoHeader showBackButton/>
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
          <Text style={GlobalStyles.header}>WEIGH IN</Text>

          {/* Weight */}
          <View style={styles.fieldBlock}>
            <Text style={GlobalStyles.text}>WEIGHT</Text>
            <TextInput
              style={GlobalStyles.textInput}
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
            <Text style={GlobalStyles.text}>BODY FAT</Text>
            <TextInput
              style={GlobalStyles.textInput}
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
            <Text style={GlobalStyles.text}>BONE MASS</Text>
            <TextInput
              style={GlobalStyles.textInput}
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
            <Text style={GlobalStyles.text}>MUSCLE MASS</Text>
            <TextInput
              style={GlobalStyles.textInput}
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
          <TouchableOpacity onPress={onSave} activeOpacity={0.9} style={GlobalStyles.button}>
            <Text style={styles.saveText}>SAVE</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default WeighIn;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  fieldBlock: { marginBottom: 16 },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  saveButton: {

  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
