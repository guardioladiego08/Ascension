// ExercisePickerModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

type ExerciseRow = {
  id: string;
  exercise_name: string;
  info: string;
};

type Props = {
  visible: boolean;
  items: ExerciseRow[];
  onPick: (name: string) => void;
  onClose: () => void;
};

const ExercisePickerModal: React.FC<Props> = ({ visible, items, onPick, onClose }) => {
  const showInfo = (exercise: ExerciseRow) => {
    Alert.alert(exercise.exercise_name, exercise.info || 'No details available');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.pickerContainer}>
          <Text style={[GlobalStyles.subtitle, { alignSelf: 'center' }]}>Select Exercise</Text>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => onPick(item.exercise_name)}
                >
                  <Text style={GlobalStyles.text}>{item.exercise_name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => showInfo(item)} style={styles.infoBtn}>
                  <MaterialIcons name="info-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          />

          <TouchableOpacity style={styles.pickerClose} onPress={onClose}>
            <Text style={styles.pickerCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ExercisePickerModal;

const styles = StyleSheet.create({
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#444',
  },
  pickerItem: { flex: 1, paddingVertical: 12 },
  infoBtn: { paddingHorizontal: 8, paddingVertical: 12 },
  pickerClose: { marginTop: 12, alignItems: 'center' },
  pickerCloseText: { color: Colors.dark.highlight1, fontSize: 16 },
});
