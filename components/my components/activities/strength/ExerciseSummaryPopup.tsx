import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { Colors } from '@/constants/Colors';
import { AM_COLORS as C } from '../add meal/theme';

interface ExerciseSet {
  setNumber: number;
  reps: number;
  weight: number;
  mode: string;
}

interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  date: string;
  duration: string;
  exercises: Exercise[];
}

const ExerciseSummaryPopup: React.FC<Props> = ({ visible, onClose, date, duration, exercises }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Workout Summary</Text>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Date: <Text style={styles.value}>{date}</Text></Text>
            <Text style={styles.label}>Duration: <Text style={styles.value}>{duration}</Text></Text>
          </View>

          <FlatList
            data={exercises}
            keyExtractor={(item, idx) => `${item.name}-${idx}`}
            renderItem={({ item }) => (
              <View style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                {item.sets.map((set, idx) => (
                  <Text key={idx} style={styles.setText}>
                    Set {set.setNumber}: {set.reps} reps × {set.weight} lbs ({set.mode})
                  </Text>
                ))}
              </View>
            )}
          />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
  },
  title: {
    color: C.orange,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoBlock: {
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    color: C.orange,
    fontWeight: '700',
  },
  exerciseCard: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  exerciseName: {
    color: C.orange,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  setText: {
    color: '#fff',
    fontSize: 14,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: C.orange,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ExerciseSummaryPopup;
