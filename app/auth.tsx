// app/auth.tsx
// Renders your Auth UI. On successful sign-in, we ALSO navigate immediately.
// This makes redirect snappy even before the global guard runs.

import React from 'react';
import { SafeAreaView } from 'react-native';
import Auth from '@/components/Auth';
import { GlobalStyles } from '@/constants/GlobalStyles';

export default function AuthRoute(): JSX.Element {
  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <Auth />
    </SafeAreaView>
  );
}
