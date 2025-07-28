// components/LogoHeader.tsx
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const LogoHeader = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/Logo.png')} // replace with your logo path
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 30, // To avoid the notch/status bar
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 85,
    height: 85,
  },
});

export default LogoHeader;
