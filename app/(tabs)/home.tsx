// app/(tabs)/profile.tsx
import { Text, View } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.backgroundColor }}>
      <Text>Home Screen</Text>
    </View>
  );
}
