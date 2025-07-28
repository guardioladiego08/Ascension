// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/my components/TabBar';


export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    />
  );
}
