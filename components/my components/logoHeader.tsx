// components/LogoHeader.tsx
import React from 'react';
import { Image, StyleSheet, View, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartBack } from '@/lib/navigation/useSmartBack';

interface LogoHeaderProps {
  showBackButton?: boolean;
  usePreviousRoute?: boolean;

  /**
   * If provided, the back button will navigate to this explicit route instead of history-based back.
   * Examples:
   *   backTo="/SignInLogin/Login"
   *   backTo="../UserInfo1"
   */
  backTo?: string;

  /**
   * Use this if you need params.
   * Example:
   *   backHref={{ pathname: "/SignInLogin/Login", params: { email: "a@b.com" } }}
   */
  backHref?: Href;

  /**
   * If true, uses router.replace(...) (good for auth/onboarding).
   * If false, uses router.push(...).
   */
  backReplace?: boolean;
  fallbackBackTo?: string;
  fallbackBackHref?: Href;

  /**
   * Optional override if you want custom behavior.
   */
  onBackPress?: () => void;
}

const LogoHeader: React.FC<LogoHeaderProps> = ({
  showBackButton = false,
  usePreviousRoute = true,
  backTo,
  backHref,
  backReplace = true,
  fallbackBackTo,
  fallbackBackHref,
  onBackPress,
}) => {
  const router = useRouter();
  const { goBackSmart } = useSmartBack();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const handleBack = () => {
    if (onBackPress) return onBackPress();

    // Prefer explicit targets over history-based back
    if (backHref) {
      if (backReplace) router.replace(backHref);
      else router.push(backHref);
      return;
    }

    if (backTo) {
      if (backReplace) router.replace(backTo as any);
      else router.push(backTo as any);
      return;
    }

    const fallbackHref = fallbackBackHref ?? fallbackBackTo ?? '/(tabs)/home';
    if (usePreviousRoute) {
      if (goBackSmart({ fallbackHref, fallbackReplace: backReplace })) return;
    }

    goBackSmart({ fallbackHref, fallbackReplace: backReplace });
  };

  return (
    <View
      style={[
        styles.container,
        {
          width,
          paddingTop: insets.top + 8,
        },
      ]}
    >
      {showBackButton && (
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              top: insets.top + 2,
            },
          ]}
          onPress={handleBack}
        >
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
      )}

      <Image
        source={require('../../assets/images/TensrLogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
    padding: 4,
  },
  backText: {
    color: 'white',
    fontSize: 45,
    lineHeight: 45,
  },
  logo: {
    width: 90,
    height: 90,
  },
});

export default LogoHeader;
