// components/activities/StrengthTraining.tsx

import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';

type SetType = { weight: string; reps: string };
type ExerciseType = { id: string; name: string; sets: SetType[] };

const EXERCISES = [
  'Bench Press Barbell',
  'Incline Press Dumbbell',
  'Squat Barbell',
  'Deadlift',
  'Overhead Press Dumbbell',
  'Barbell Row',
];

const FOOTER_HEIGHT = 100; // adjust if you change footer padding

const StrengthTraining = forwardRef<BottomSheetModal>((_, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [exercises, setExercises] = useState<ExerciseType[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  // expose present/dismiss
  useImperativeHandle(ref, () => ({
    present: () => {
      sheetRef.current?.present();              // opens at initial snap
      setSeconds(0);
      setRunning(true);
    },
    dismiss: () => {
      sheetRef.current?.dismiss();
      setRunning(false);
    },
  }));

  // timer effect
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const addExercise = (name: string) => {
    setExercises(es => [
      ...es,
      { id: String(Date.now()), name, sets: [] },
    ]);
    setPickerVisible(false);
  };

  const addSet = (id: string) =>
    setExercises(es =>
      es.map(ex =>
        ex.id === id
          ? { ...ex, sets: [...ex.sets, { weight: '', reps: '' }] }
          : ex
      )
    );

  const updateSet = (
    exId: string,
    idx: number,
    field: 'weight' | 'reps',
    val: string
  ) =>
    setExercises(es =>
      es.map(ex =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((st, i) =>
                i === idx ? { ...st, [field]: val } : st
              ),
            }
          : ex
      )
    );

  const totalWeight = exercises.reduce(
    (sumEx, ex) =>
      sumEx +
      ex.sets.reduce((sumSet, st) => {
        const w = parseFloat(st.weight) || 0;
        const r = parseInt(st.reps, 10) || 0;
        return sumSet + w * r;
      }, 0),
    0
  );

  return (
    <>
      {/* Exercise picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Exercise</Text>
            <FlatList
              data={EXERCISES}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => addExercise(item)}
                >
                  <Text style={styles.pickerText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.pickerClose}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.pickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-screen bottom sheet with two snap positions: 5% or 100% */}
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['5%', '100%']}
        initialSnapIndex={1}           // start open at 100%
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: '#222' }}
      >
        <BottomSheetView style={styles.container}>
          {/* 1) Scrollable exercises list */}
          <View style={styles.scrollWrapper}>
            <BottomSheetScrollView
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: FOOTER_HEIGHT + 16 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {exercises.map(ex => (
                <View key={ex.id} style={styles.section}>
                  <Text style={styles.sectionTitle}>{ex.name}</Text>
                  <View style={styles.headerRow}>
                    <Text style={styles.headerCell}>SET</Text>
                    <Text style={styles.headerCell}>WEIGHT</Text>
                    <Text style={styles.headerCell}>REPS</Text>
                  </View>
                  {ex.sets.map((st, i) => (
                    <View key={i} style={styles.dataRow}>
                      <Text style={styles.cell}>{i + 1}</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#888"
                        value={st.weight}
                        onChangeText={v => updateSet(ex.id, i, 'weight', v)}
                      />
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#888"
                        value={st.reps}
                        onChangeText={v => updateSet(ex.id, i, 'reps', v)}
                      />
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addSetBtn}
                    onPress={() => addSet(ex.id)}
                  >
                    <MaterialIcons
                      name="add-circle-outline"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {!exercises.length && (
                <View style={styles.noExercise}>
                  <Text style={styles.noExerciseText}>
                    No exercises yet. Tap below to add.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.addExerciseBtn}
                onPress={() => setPickerVisible(true)}
              >
                <MaterialIcons name="add" size={20} color="white" />
                <Text style={styles.addExerciseText}>Add Exercise</Text>
              </TouchableOpacity>
            </BottomSheetScrollView>
          </View>

          {/* 2) Pinned footer */}
          <View style={styles.footer}>
            <View style={styles.totalsRow}>
              <View>
                <Text style={styles.footerLabel}>TIME</Text>
                <Text style={styles.footerValue}>
                  {formatTime(seconds)}
                </Text>
              </View>
              <View>
                <Text style={styles.footerLabel}>TOTAL WEIGHT</Text>
                <Text style={styles.footerValue}>
                  {totalWeight} lbs
                </Text>
              </View>
            </View>
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={() => setRunning(r => !r)}
              >
                <Text style={styles.footerBtnText}>
                  {running ? 'Pause' : 'Resume'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={() => {
                  sheetRef.current?.dismiss();
                  setRunning(false);
                }}
              >
                <Text style={styles.footerBtnText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
});

export default StrengthTraining;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#666',
    paddingBottom: 4,
  },
  headerCell: { flex: 1, textAlign: 'center', color: '#AAA' },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cell: { flex: 1, textAlign: 'center', color: 'white' },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#888',
    color: 'white',
    textAlign: 'center',
    paddingVertical: 4,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addSetText: { color: 'white', marginLeft: 4 },
  noExercise: { alignItems: 'center', padding: 24 },
  noExerciseText: { color: '#AAA' },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF950A',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  addExerciseText: { color: 'white', marginLeft: 8, fontSize: 16 },

  footer: {
    height: FOOTER_HEIGHT,
    borderTopWidth: 1,
    borderColor: '#444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#333',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  footerLabel: { color: '#AAA', fontSize: 12 },
  footerValue: { color: 'white', fontSize: 18, fontWeight: '700' },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  footerBtn: {
    flex: 1,
    backgroundColor: '#555',
    marginHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  footerBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },

  // picker modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#333',
    borderRadius: 8,
    maxHeight: '80%',
    padding: 16,
  },
  pickerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#444',
  },
  pickerText: { color: 'white', fontSize: 16 },
  pickerClose: { marginTop: 12, alignItems: 'center' },
  pickerCloseText: { color: '#FF950A', fontSize: 16 },
});
