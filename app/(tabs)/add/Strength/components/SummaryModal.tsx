// app/(tabs)/add/Strength/components/SummaryModal.tsx
import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import type { ExerciseDraft } from '../StrengthTrain';

type Props = {
  visible: boolean;
  onClose: () => void;
  workoutTotalVolKg: number;
  exercises: ExerciseDraft[];
};

const SummaryModal: React.FC<Props> = ({
  visible,
  onClose,
  workoutTotalVolKg,
  exercises,
}) => {
  const items = useMemo(
    () =>
      exercises.map(e => {
        const volKg = e.sets.reduce(
          (v, s) =>
            v +
            (s.weight_unit_csv === 'kg'
              ? (s.weight ?? 0) * (s.reps ?? 0)
              : 0),
          0,
        );
        const volLb = e.sets.reduce(
          (v, s) =>
            v +
            (s.weight_unit_csv === 'lb'
              ? (s.weight ?? 0) * (s.reps ?? 0)
              : 0),
          0,
        );
        return {
          name: e.exercise_name,
          sets: e.sets.length,
          volKg,
          volLb,
        };
      }),
    [exercises],
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Workout Summary</Text>
          <Text style={styles.metric}>
            Total Volume: {workoutTotalVolKg.toFixed(1)} kg
          </Text>

          <FlatList
            data={items}
            keyExtractor={i => i.name}
            style={{ maxHeight: 260, marginTop: 8 }}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.right}>
                  {item.sets} sets ·{' '}
                  {item.volKg
                    ? `${item.volKg.toFixed(0)}kg`
                    : `${item.volLb.toFixed(0)}lb`}
                </Text>
              </View>
            )}
          />

          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default SummaryModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '88%',
    backgroundColor: '#121a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a3557',
  },
  title: {
    color: '#e7ecff',
    fontSize: 18,
    fontWeight: '800',
  },
  metric: {
    color: '#b9c3ff',
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2946',
  },
  name: { color: '#e7ecff' },
  right: { color: '#98a3d3' },
  btn: {
    height: 44,
    backgroundColor: '#5b64ff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
