// app/(tabs)/new.tsx
import React, { useRef } from 'react';
import { Button, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import LogoHeader from '@/components/my components/logoHeader';

import StrengthTrain from '@/components/my components/activities/strengthTrain'
import AddMeal from '@/components/my components/activities/addMeal';
//import ModalThree from '@/components/modals/ModalThree';

const NewActivityScreen = () => {
  const strengthTrainRef = useRef<BottomSheetModal>(null);
  const addMealRef = useRef<BottomSheetModal>(null);
  const modalThreeRef = useRef<BottomSheetModal>(null);

  return (
    
    <GestureHandlerRootView style={styles.container}>
      <LogoHeader></LogoHeader>
      <BottomSheetModalProvider>
        <Button title="Strength Train" onPress={() => strengthTrainRef.current?.present()} />
        <Button title="Add a Meal" onPress={() => addMealRef.current?.present()} />
        <Button title="Open Modal 3" color="#32CD32" onPress={() => modalThreeRef.current?.present()} />

        <StrengthTrain ref={strengthTrainRef} />
        <AddMeal ref={addMealRef} />
        
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
};

export default NewActivityScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-evenly',
    backgroundColor: '#1c1c1e',
  },
});
