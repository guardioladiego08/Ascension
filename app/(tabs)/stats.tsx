// app/(tabs)/stats.tsx (or wherever this screen lives)
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, View, Text, Button } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";

const Stats: React.FC = () => {
  // ref
  const sheetRef = useRef<BottomSheet>(null);

  // data
  const data = useMemo(
    () => Array.from({ length: 50 }, (_, i) => `index-${i}`),
    []
  );

  // only one snap point: 100% (full screen)
  const snapPoints = useMemo(() => ["100%"], []);

  // handlers
  const handleOpen = useCallback(() => {
    // either expand() or snapToIndex(0) — both go to the only snap point (100%)
    sheetRef.current?.expand();
  }, []);

  const handleSheetChange = useCallback((index: number) => {
    console.log("sheet index changed:", index);
  }, []);

  const renderItem = useCallback(
    (item: string) => (
      <View key={item} style={styles.itemContainer}>
        <Text>{item}</Text>
      </View>
    ),
    []
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Button title="Open Stats" onPress={handleOpen} />
      </View>

      <BottomSheet
        ref={sheetRef}
        // start closed
        index={-1}
        // only full-screen snap point
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        // allow user to dismiss by swiping down if you want; set to false to force full-screen until closed programmatically
        enablePanDownToClose
        onChange={handleSheetChange}
      >
        <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
          {data.map(renderItem)}
        </BottomSheetScrollView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 200,
    backgroundColor: "#f7f7f7",
  },
  header: {
    paddingHorizontal: 16,
  },
  contentContainer: {
    backgroundColor: "white",
    paddingVertical: 8,
  },
  itemContainer: {
    padding: 8,
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
});

export default Stats;
