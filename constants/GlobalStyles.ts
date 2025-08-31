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
    justifyContent: 'space-between'
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
  card: {
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardText: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
