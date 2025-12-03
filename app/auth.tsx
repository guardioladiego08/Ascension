// app/auth.tsx
// Legacy /auth route -> redirect into new auth flow

import React from 'react';
import { Redirect } from 'expo-router';

export default function AuthRoute(): JSX.Element {
  return <Redirect href="@/SignInLogin/FirstPage" />;
}
