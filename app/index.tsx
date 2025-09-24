// app/(tabs)/index.tsx
// optional: opening the tabs group goes to /home
import { Redirect } from 'expo-router';
export default function TabsIndex() { return <Redirect href="/home" />; }
