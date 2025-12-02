// components/my components/LargeLogo.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.tint;

type LargeLogoProps = {
  /** Diameter of the inner circle (where your logo sits) */
  size?: number;
  /** Put your logo (Image, SVG, icon, etc.) here */
  children: React.ReactNode;
  
};

export default function LargeLogo({ size = 96, children }: LargeLogoProps) {
  const outerSize = size * 1.4;

  return (
    <View
      style={[
        styles.outer,
        { width: outerSize, height: outerSize, borderRadius: outerSize / 2 },
      ]}
    >
      <View
        style={[
          styles.inner,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY + '22', // soft tinted halo
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#3A465E',
  },
});
