// components/LogoHeader.tsx
import React from 'react';
import { Image, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';

interface LogoHeaderProps {
  showBackButton?: boolean;   // <- optional flag
}

const LogoHeader: React.FC<LogoHeaderProps> = ({ showBackButton = false }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {showBackButton && (
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={{ color: 'white', fontSize: 45 }}>{'‹'}</Text>
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
  logo: {
    width: 90,
    height: 90,
  },
});

export default LogoHeader;
