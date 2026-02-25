// components/LogoHeader.tsx
import React from 'react';
import { Image, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Href, useRouter } from 'expo-router';

interface LogoHeaderProps {
  showBackButton?: boolean;

  /**
   * If provided, the back button will navigate to this explicit route instead of router.back().
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
  backHref?: Href<string | object>;

  /**
   * If true, uses router.replace(...) (good for auth/onboarding).
   * If false, uses router.push(...).
   */
  backReplace?: boolean;

  /**
   * Optional override if you want custom behavior.
   */
  onBackPress?: () => void;
}

const LogoHeader: React.FC<LogoHeaderProps> = ({
  showBackButton = false,
  backTo,
  backHref,
  backReplace = true,
  onBackPress,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) return onBackPress();

    // Prefer explicit targets over router.back()
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

    router.back();
  };

  return (
    <View style={styles.container}>
      {showBackButton && (
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
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
    paddingTop: 50, // notch / status bar padding
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 55,
    padding: 4,
    zIndex: 1,
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