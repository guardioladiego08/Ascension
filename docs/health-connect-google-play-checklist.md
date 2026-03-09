# Health Connect Google Play Checklist

This repo now includes the Android-side Health Connect wiring needed in source control:

- `android.permission.health.READ_HEART_RATE`
- package visibility for `com.google.android.apps.healthdata`
- an in-app permissions rationale activity
- `minSdkVersion` raised to `26`
- JS provider scaffolding for Health Connect reads

Release still requires console work that cannot be committed in code:

1. Install dependencies and rebuild the Android app.
   - `react-native-health-connect`
   - `expo-health-connect`
   - create a new Android dev build / release build

2. Replace the local privacy policy placeholder.
   - Update [`health_connect_privacy_policy.html`](/Users/diegoguardiola/Desktop/Ascension-main/android/app/src/main/assets/health_connect_privacy_policy.html)
   - Make sure the text matches the public privacy policy URL submitted in Google Play

3. Complete the Google Play Health Apps declaration form.
   - Declare Health Connect usage
   - Declare the exact data type requested: heart rate
   - Keep the declaration scoped to current functionality

4. Update the Google Play Data safety form.
   - Health and fitness data collected or accessed
   - Purpose of use
   - Retention/deletion behavior
   - Sharing disclosures if applicable

5. Verify in-app disclosures and user controls.
   - Permissions requested only when needed
   - Clear explanation of why heart-rate data is used
   - A working path to revoke access in Health Connect

6. Re-review if scope expands.
   - If you add steps, distance, exercise sessions, background access, or historical reads older
     than Health Connect's default window, update the manifest, app disclosures, and Play
     declarations again.
