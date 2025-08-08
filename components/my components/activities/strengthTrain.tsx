// components/activities/StrengthTraining.tsx
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
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
import { Colors } from '@/constants/Colors';

type SetType = { weight: string; reps: string };
type ExerciseType = { id: string; name: string; sets: SetType[] };

const EXERCISES = [
  'Bench Press (Barbell)',
  'Incline Press (Dumbbell)',
  'Back Squat (Barbell)',
  'Deadlift',
  'Overhead Press (Dumbbell)',
  'Barbell Row',
];

const StrengthTraining = forwardRef<BottomSheetModal>((_, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [exercises, setExercises] = useState<ExerciseType[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  /* ---------- Expose controls ---------- */
  useImperativeHandle(ref, () => ({
    present: () => {
      resetSession();
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      stopTimer();
      bottomSheetRef.current?.dismiss();
    },
  }));

  /* ---------- Timer ---------- */
  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetSession = () => {
    setSeconds(0);
    setExercises([]);
    setShowConfirm(false);
    setIsRunning(true);
    startTimer();
  };

  useEffect(() => {
    if (isRunning) startTimer();
    else stopTimer();
    return stopTimer;
  }, [isRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  /* ---------- CRUD ---------- */
  const addExercise = (name: string) => {
    setExercises(es => [...es, { id: String(Date.now()), name, sets: [] }]);
    setPickerVisible(false);
  };

  const addSet = (exId: string) =>
    setExercises(es =>
      es.map(ex =>
        ex.id === exId
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

  const removeExercise = (exId: string) =>
    setExercises(es => es.filter(e => e.id !== exId));

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
      {/* Exercise Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Exercise</Text>
            <FlatList
              data={EXERCISES}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerItem} onPress={() => addExercise(item)}>
                  <Text style={styles.pickerText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.pickerClose} onPress={() => setPickerVisible(false)}>
              <Text style={styles.pickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={['100%']}
        index={1}
        enablePanDownToClose={false}
        backgroundStyle={{ borderRadius: 0, backgroundColor: Colors.dark.background }}
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.title}>STRENGTH TRAINING</Text>
          <View style={styles.underline} />

          <BottomSheetScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Exercise List */}
            {exercises.map((ex, exIdx) => (
              <View key={ex.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {exIdx + 1}. {ex.name}
                  </Text>
                  <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                    <MaterialIcons name="delete" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.headerRow}>
                  <Text style={styles.headerCell}>SET</Text>
                  <Text style={styles.headerCell}>WEIGHT</Text>
                  <Text style={styles.headerCell}>REPS</Text>
                </View>

                {ex.sets.map((st, i) => (
                  <View key={`${ex.id}-${i}`} style={styles.dataRow}>
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

                <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ex.id)}>
                  <MaterialIcons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.addSetText}>Add Set</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Empty State */}
            {exercises.length === 0 && (
              <View style={styles.noExercise}>
                <Text style={styles.noExerciseText}>No exercises yet. Tap below to add.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setPickerVisible(true)}>
              <MaterialIcons name="add" size={20} color="white" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </TouchableOpacity>

            {/* Footer inside scroll */}
            <View style={styles.underline} />

            <View style={styles.metricRow}>
              <View style={styles.metricBox}>
                <Text style={styles.label}>Time</Text>
                <Text style={styles.value}>{formatTime(seconds)}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.label}>Total Weight</Text>
                <Text style={styles.value}>{totalWeight} lbs</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.pauseButton} onPress={() => setIsRunning(p => !p)}>
                <Text style={styles.buttonText}>{isRunning ? 'Pause' : 'Resume'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.finishButton} onPress={() => setShowConfirm(true)}>
                <Text style={styles.buttonText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </BottomSheetScrollView>

          {showConfirm && (
            <View style={styles.sheetOverlay}>
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>Are you sure you're finished?</Text>
                <View style={styles.confirmButtons}>
                  <TouchableOpacity onPress={() => setShowConfirm(false)} style={styles.confirmBtn}>
                    <Text style={styles.buttonText}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowConfirm(false);
                      bottomSheetRef.current?.dismiss();
                      stopTimer();
                    }}
                    style={styles.confirmBtn}
                  >
                    <Text style={styles.buttonText}>Yes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
});

export default StrengthTraining;


/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: Colors.dark.background,
  },

  /* fixed header */
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 35,
    marginBottom: 16,
    textAlign: 'center',
  },
  underline: {
    height: 1,
    backgroundColor: Colors.dark.text,
    marginTop: 4,
    marginBottom: 0, // keep tight; scroll starts immediately after
  },

  /* scroll */
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40, // breathing room at the bottom
  },

  /* section card */
  section: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#666',
    paddingBottom: 6,
  },
  headerCell: { flex: 1, textAlign: 'center', color: '#AAA' },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    alignItems: 'center',
  },
  cell: { flex: 1, textAlign: 'center', color: 'white' },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#888',
    color: 'white',
    textAlign: 'center',
    paddingVertical: 2,
    marginHorizontal: 4,
  },

  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  addSetText: { color: 'white', marginLeft: 6, fontSize: 14 },

  noExercise: { alignItems: 'center', padding: 24 },
  noExerciseText: { color: '#AAA' },

  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF950A',
    padding: 14,
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  addExerciseText: { color: 'white', marginLeft: 8, fontSize: 16 },

  /* footer metrics and actions (now inside scroll) */
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  metricBox: {
    flexDirection: 'column',
  },
  label: {
    color: Colors.dark.text,
    fontSize: 18,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  pauseButton: {
    backgroundColor: '#444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  finishButton: {
    backgroundColor: '#FF950A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  /* confirm overlay */
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBox: {
    backgroundColor: '#333',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  confirmBtn: {
    backgroundColor: '#555',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },

  /* picker modal */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#333',
    borderRadius: 12,
    maxHeight: '80%',
    padding: 16,
  },
  pickerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
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
