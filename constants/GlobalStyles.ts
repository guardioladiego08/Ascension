// app/constants/GlobalStyles.ts
import { StyleSheet } from 'react-native';
import { Colors } from './Colors';
import { Fonts } from './Fonts';

export const GlobalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.dark.background,

  },
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.regular,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.regular,
    fontSize: 18,
    fontWeight: '700',
  },
  underline:{
    height: 1,
    backgroundColor: Colors.dark.text,
    marginBottom: 10,
    marginTop: 4
  },
  text: {
    color: Colors.dark.text,
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  textBold: {
    color: Colors.dark.text,
    fontFamily: Fonts.regular,
    fontSize: 16,
    fontWeight: '700',
  },
  Chart: {
    wrap: { 
      paddingHorizontal: 16, 
      paddingTop: 15, 
      paddingBottom:15 
    },
    badge: {
      marginTop: 2,
      marginLeft: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: '#111',
      borderWidth: 1,
      borderColor: '#333',
      alignSelf: 'flex-start',
    },
    text: {
      color: Colors.dark.text,
      fontWeight: '600',
      fontSize: 12,
    },
  },
});
