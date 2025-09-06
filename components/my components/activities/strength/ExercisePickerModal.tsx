// components/my components/strength/ExercisePickerModal.tsx
// -----------------------------------------------------------------------------
// Modal to pick an exercise from a simple list
// - visible: controls display
// - onPick(name): called when an exercise is chosen
// - onClose(): dismisses the modal
// -----------------------------------------------------------------------------

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

type Props = {
  visible: boolean;
  items: string[];
  onPick: (name: string) => void;
  onClose: () => void;
};

const ExercisePickerModal: React.FC<Props> = ({ visible, items, onPick, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.pickerContainer}>
          <Text style={[GlobalStyles.subtitle, {alignSelf: 'center'}]}>Select Exercise</Text>

          <FlatList
            data={items}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => onPick(item)}>
                <Text style={GlobalStyles.text}>{item}</Text>
              </TouchableOpacity>
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
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#444' },
  pickerText: { color: 'white', fontSize: 16 },
  pickerClose: { marginTop: 12, alignItems: 'center' },
  pickerCloseText: { color: Colors.dark.highlight1, fontSize: 16 },
});
