// app/(tabs)/new/index.tsx
import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import LogoHeader from '@/components/my components/logoHeader';


const NewActivityScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);



  return (
    <GestureHandlerRootView style={styles.container}>
      <LogoHeader />
      <Text style={styles.header}>NEW ACTIVITY</Text>

      <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="shoe-sneaker" size={75} color="#FF950A" />
        <Text style={styles.buttonText}>CARDIO</Text>
      </TouchableOpacity>

      {/* ❗️Use absolute href that matches the actual file name */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(tabs)/new/StrengthTrain')}
      >
        <MaterialCommunityIcons name="dumbbell" size={75} color="#FF950A" />
        <Text style={styles.buttonText}>Strength Train</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(tabs)/new/AddMeal')}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={75} color="#FF950A" />
        <Text style={styles.buttonText}>Add A Meal</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(tabs)/new/WeighIn')}>
        <MaterialCommunityIcons name="scale-bathroom" size={75} color="#FF950A" />
        <Text style={styles.buttonText}>Weigh In</Text>
      </TouchableOpacity>

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
                  onPress={() => router.push('/(tabs)/new/IndoorSession')}
                >
                  <Text style={styles.buttonText}>INDOOR SESSION</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => router.push('/(tabs)/new/OutdoorSession')}
                >
                  <Text style={styles.buttonText}>OUTDOOR SESSION</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* mount once */}
    </GestureHandlerRootView>
  );
};

export default NewActivityScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333', paddingHorizontal: 8 },
  header: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', alignSelf: 'center', marginVertical: 24 },
  button: { flexDirection: 'row', alignItems: 'center', borderColor: '#FFFFFF', borderWidth: 1, borderRadius: 12, padding: 16, marginVertical: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 26, marginLeft: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(128,128,128,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '80%' },
});
