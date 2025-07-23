// app/(tabs)/new/add-meal.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const AddMealPage: React.FC = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Add A Meal</Text>
        {/* TODO: insert your meal logging UI here */}
      </View>
    </SafeAreaView>
  );
};

export default AddMealPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 30
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
