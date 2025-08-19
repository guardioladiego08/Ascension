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
import IndoorWalk from '@/components/my components/activities/indoorWalk';
import OutdoorWalk from '@/components/my components/activities/outdoorWalk';
import IndoorRun from '@/components/my components/activities/indoorRun';
import OutdoorRun from '@/components/my components/activities/outdoorRun';
import AddMeal from '@/components/my components/activities/addMeal';
import WeighIn from '@/components/my components/activities/weighIn';

const NewActivityScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const indoorWalkRef = useRef<BottomSheetModal>(null);
  const outdoorWalkRef = useRef<BottomSheetModal>(null);
  const indoorRunRef = useRef<BottomSheetModal>(null);
  const outdoorRunRef = useRef<BottomSheetModal>(null);
  const addMealRef = useRef<BottomSheetModal>(null);
  const weighInRef = useRef<BottomSheetModal>(null);

  return (
    <GestureHandlerRootView style={styles.container}>
      <LogoHeader />
      <Text style={styles.header}>NEW ACTIVITY</Text>

      <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="shoe-sneaker" size={75} color="#FF950A" />
        <Text style={styles.buttonText}>Go For A Run</Text>
      </TouchableOpacity>

      {/* ❗️Use absolute href that matches the actual file name */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(tabs)/new/StrengthTrain')}
      >
        <MaterialCommunityIcons name="dumbbell" size={75} color="#FF950A" />
        <Text style={styles.buttonText}>Strength Train</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => addMealRef.current?.present()}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={75} color="#FF950A" />
        <Text style={styles.buttonText}>Add A Meal</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => weighInRef.current?.present()}>
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
                  onPress={() => {
                    setModalVisible(false);
                    indoorWalkRef.current?.present();
                  }}
                >
                  <Text style={styles.buttonText}>INDOOR WALK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    setModalVisible(false);
                    outdoorWalkRef.current?.present();
                  }}
                >
                  <Text style={styles.buttonText}>OUTDOOR WALK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    setModalVisible(false);
                    indoorRunRef.current?.present();
                  }}
                >
                  <Text style={styles.buttonText}>INDOOR RUN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    setModalVisible(false);
                    outdoorRunRef.current?.present();
                  }}
                >
                  <Text style={styles.buttonText}>OUTDOOR RUN</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* mount once */}
      <IndoorWalk ref={indoorWalkRef} />
      <OutdoorWalk ref={outdoorWalkRef} />
      <IndoorRun ref={indoorRunRef} />
      <OutdoorRun ref={outdoorRunRef} />
      <AddMeal ref={addMealRef} />
      <WeighIn ref={weighInRef} />
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
