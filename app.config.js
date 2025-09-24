// app.config.ts
import 'dotenv/config';

export default {
  expo: {
    name: 'Ascension',
    slug: 'ascension',
    scheme: 'ascension',
    version: '1.0.0',
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    orientation: 'portrait',

    // Correct path to your actual icon
    icon: './assets/images/icon.png',

    userInterfaceStyle: 'automatic',

    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: true,
    },

    android: {
      package: 'com.yourcompany.ascension',

      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',  // fixed path
        backgroundColor: '#000000',
      },

      config: {
        googleMaps: {
          apiKey: process.env.ANDROID_MAPS_API_KEY,
        },
      },
    },

    plugins: [],

    extra: {
      ANDROID_MAPS_API_KEY: process.env.ANDROID_MAPS_API_KEY,
    },
  },
};
