import React, { forwardRef } from 'react';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { StyleSheet, Text } from 'react-native';

const WeighIn = forwardRef<BottomSheetModal>((_, ref) => {
  return (
    <BottomSheetModal ref={ref} snapPoints={['25%', '90%']}>
      <BottomSheetView style={styles.content}>
        <Text style={styles.text}>Weigh In</Text>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default WeighIn;

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, fontWeight: 'bold' },
});
