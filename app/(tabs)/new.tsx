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
  TouchableWithoutFeedback,
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

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <TouchableOpacity
                  style={styles.button}
                  //onPress={}
                >
                  <Text style={styles.buttonText}>INDOOR WALK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  //onPress={}
                >
                  <Text style={styles.buttonText}>OUTDOOR WALK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  //onPress={}
                >
                  <Text style={styles.buttonText}>INDOOR RUN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  //onPress={}
                >
                  <Text style={styles.buttonText}>OUTDOOR RUN</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(128,128,128,0.8)', // grey at 80% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
  },
});