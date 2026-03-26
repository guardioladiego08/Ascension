import React from 'react';
import { StyleSheet } from 'react-native';

import AppPopup from '@/components/ui/AppPopup';

import ExercisePickerLibrary, {
  type ExercisePickerSelection,
} from './ExercisePickerLibrary';

type Props = {
  visible: boolean;
  onPick: (ex: ExercisePickerSelection) => void;
  onClose: () => void;
  tableName?: string;
};

const ExercisePickerModal: React.FC<Props> = ({
  visible,
  onPick,
  onClose,
  tableName = 'exercises',
}) => (
  <AppPopup
    visible={visible}
    onClose={onClose}
    eyebrow="Exercise library"
    title="Select exercise"
    showCloseButton
    align="bottom"
    contentStyle={styles.container}
    bodyStyle={styles.body}
  >
    <ExercisePickerLibrary
      visible={visible}
      onPick={onPick}
      onClose={onClose}
      tableName={tableName}
    />
  </AppPopup>
);

const styles = StyleSheet.create({
  container: {
    height: '90%',
    maxHeight: '90%',
    gap: 0,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});

export default ExercisePickerModal;
