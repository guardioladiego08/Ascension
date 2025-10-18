// app.config.ts
import 'dotenv/config';

export default {
  expo: {
    name: 'Ascension',
    slug: 'ascension',
    scheme: 'ascension',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',

    icon: './assets/images/icon.png',
    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: true,
    },

    android: {
      package: 'com.yourcompany.ascension',
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#000000',
      },
      config: {
        googleMaps: {
          apiKey: process.env.ANDROID_MAPS_API_KEY,
        },
      },
    },

    plugins: ['expo-router', 'expo-web-browser'],

    // ✅ merged extras so nothing gets lost
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      ANDROID_MAPS_API_KEY: process.env.ANDROID_MAPS_API_KEY,
    },
  },
};
