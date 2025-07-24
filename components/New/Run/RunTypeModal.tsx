// components/ActivityTypeModal.tsx
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface RunTypeModalProps {
  visible: boolean;
  onClose: () => void;
}

const RunTypeModal: React.FC<RunTypeModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    onClose();
    router.push(route);  // e.g. "/new/IndoorWalk"
    };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleNavigation('/new/RunWalk/IndoorWalk')}
              >
                <Text style={styles.buttonText}>INDOOR WALK</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleNavigation('/OutdoorWalk')}
              >
                <Text style={styles.buttonText}>OUTDOOR WALK</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleNavigation('/IndoorRun')}
              >
                <Text style={styles.buttonText}>INDOOR RUN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleNavigation('/OutdoorRun')}
              >
                <Text style={styles.buttonText}>OUTDOOR RUN</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(128,128,128,0.8)', // grey at 80% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
  },
  button: {
    backgroundColor: Colors.dark.highlight1,
    paddingVertical: 14,
    marginVertical: 8,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default RunTypeModal;
