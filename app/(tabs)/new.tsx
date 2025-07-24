// app/(tabs)/new/index.tsx
import LogoHeader from '@/components/Header/LogoHeader';
import RunTypeModal from '@/components/New/Run/RunTypeModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const NewActivity: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader></LogoHeader>
      <Text style={styles.header}>NEW ACTIVITY</Text>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
          <MaterialCommunityIcons name="shoe-sneaker" size={75} color="#FF950A" />
          <Text style={styles.buttonText}>Go For A Run</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/new/strengthTrain')}>
          <MaterialCommunityIcons name="dumbbell" size={75} color="#FF950A" />
          <Text style={styles.buttonText}>Strength Train</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/new/newMeal')}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={75} color="#FF950A" />
          <Text style={styles.buttonText}>Add A Meal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/new/weighIn')}>
          <MaterialCommunityIcons name="scale-bathroom" size={75} color="#FF950A" />
          <Text style={styles.buttonText}>Weight In</Text>
        </TouchableOpacity>
      </View>

      <RunTypeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
      
    </SafeAreaView>
  );
};

export default NewActivity;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333333',
    paddingHorizontal: 16,
  },
  header: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 1,
    alignSelf: 'center',
    marginVertical: 24,
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 26,
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#FF7D0A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
