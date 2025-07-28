// components/ReusableBottomSheetModal.tsx
import React, { forwardRef } from 'react';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { StyleSheet, Text } from 'react-native';

export interface ModalProps {
  label: string;
  snapPoints?: (string | number)[];
}

const ReusableBottomSheetModal = forwardRef<BottomSheetModal, ModalProps>(
  ({ label, snapPoints = ['10%', '90%'] }, ref) => {
    return (
      <BottomSheetModal ref={ref} snapPoints={snapPoints}>
        <BottomSheetView style={styles.content}>
          <Text style={styles.text}>{label}</Text>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export default ReusableBottomSheetModal;

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
  },
});
