// app.config.ts
import 'dotenv/config';

export default {
  expo: {
    name: 'Tensr Fitness',
    slug: 'tensr-fitness',
    scheme: 'tensr',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',

    icon: './assets/images/icon.png',
    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Tensr Fitness uses your location to record and display outdoor runs and walks on the map.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Tensr Fitness uses your location to record and display outdoor runs and walks on the map.',
      },
    },

    android: {
      package: 'com.tensrfitness.app',
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#000000',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'FOREGROUND_SERVICE',
      ],
      config: {
        googleMaps: {
          apiKey: process.env.ANDROID_MAPS_API_KEY,
        },
      },
    },

    plugins: [
  'expo-router',
  'expo-web-browser',
  [
    'expo-build-properties',
    {
      android: {
        compileSdkVersion: 36,
        targetSdkVersion: 36,
        kotlinVersion: '2.1.20',
        extraMavenRepos: [
          'https://api.mapbox.com/downloads/v2/releases/maven',
          'https://www.jitpack.io',
          '../node_modules/react-native/android',
        ],
      },
    },
  ],
],



    // ✅ Environment variables accessible from `Constants.expoConfig.extra`
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      ANDROID_MAPS_API_KEY: process.env.ANDROID_MAPS_API_KEY,
      MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
      MAPBOX_DOWNLOAD_TOKEN: process.env.MAPBOX_DOWNLOAD_TOKEN,
      eas: {
        projectId: 'your-eas-project-id', // optional if using EAS updates
      },
    },

    // Optional for OTA updates / EAS
    runtimeVersion: {
      policy: 'sdkVersion',
    },

    // Optional: if you use splash screen
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
  },
};
