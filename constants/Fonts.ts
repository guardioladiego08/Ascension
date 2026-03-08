import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { RobotoFlex_400Regular } from '@expo-google-fonts/roboto-flex';

export const Fonts = {
  display: 'Poppins_700Bold',
  heading: 'Poppins_600SemiBold',
  label: 'Poppins_600SemiBold',
  body: 'RobotoFlex_400Regular',
  mono: 'SpaceMono-Regular',
  regular: 'RobotoFlex_400Regular',
  bold: 'Poppins_700Bold',
} as const;

export const FontAssets = {
  [Fonts.display]: Poppins_700Bold,
  [Fonts.heading]: Poppins_600SemiBold,
  [Fonts.body]: RobotoFlex_400Regular,
  [Fonts.mono]: require('../assets/fonts/SpaceMono-Regular.ttf'),
} as const;

export type AppFonts = typeof Fonts;
