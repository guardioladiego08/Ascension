// app/(tabs)/new/index.tsx
import LogoHeader from '@/components/Header/LogoHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
          <MaterialCommunityIcons name="shoe-sneaker" size={24} color="#FF7D0A" />
          <Text style={styles.buttonText}>Go For A Run</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/new/strengthTrain')}>
          <MaterialCommunityIcons name="dumbbell" size={24} color="#FF7D0A" />
          <Text style={styles.buttonText}>Strength Train</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/new/newMeal')}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#FF7D0A" />
          <Text style={styles.buttonText}>Add A Meal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/new/weighIn')}>
          <MaterialCommunityIcons name="scale-bathroom" size={24} color="#FF7D0A" />
          <Text style={styles.buttonText}>Weight In</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Go For A Run</Text>
            <Text style={styles.modalBody}>
              Start your run session here.
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
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
    fontSize: 18,
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
