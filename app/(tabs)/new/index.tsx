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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LogoHeader from '@/components/my components/logoHeader';
import { GlobalStyles } from '@/constants/GlobalStyles';


const NewActivityScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);



  return (
    <GestureHandlerRootView style={GlobalStyles.container}>
      <LogoHeader />
      <Text style={[GlobalStyles.header, { marginBottom: 30 }]}>NEW ACTIVITY</Text>

      <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="shoe-sneaker" size={75} color="#FF950A" />
        <Text style={[GlobalStyles.title, { marginLeft: 16 }]}>CARDIO</Text>
      </TouchableOpacity>

      {/* ❗️Use absolute href that matches the actual file name */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(tabs)/new/StrengthTrain')}
      >
        <MaterialCommunityIcons name="dumbbell" size={75} color="#FF950A" />
        <Text style={[GlobalStyles.title, { marginLeft: 16 }]}>Strength Train</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(tabs)/new/AddMeal')}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={75} color="#FF950A" />
        <Text style={[GlobalStyles.title, { marginLeft: 16 }]}>Add A Meal</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(tabs)/new/WeighIn')}>
        <MaterialCommunityIcons name="scale-bathroom" size={75} color="#FF950A" />
        <Text style={[GlobalStyles.title, { marginLeft: 16 }]}>Weigh In</Text>
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
                  <Text style={GlobalStyles.subtitle}>INDOOR SESSION</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => router.push('/(tabs)/new/OutdoorSession')}
                >
                  <Text style={GlobalStyles.subtitle}>OUTDOOR SESSION</Text>
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
  button: { flexDirection: 'row', alignItems: 'center', borderColor: '#FFFFFF', borderWidth: 1, borderRadius: 12, padding: 16, marginVertical: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(128, 128, 128, 0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '80%' },
});
