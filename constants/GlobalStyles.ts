// app/constants/GlobalStyles.ts
import { StyleSheet } from 'react-native';
import { Colors } from './Colors';
import { Fonts } from './Fonts';

export const GlobalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 15
  },
  container: {
    padding: 10,
  },
  header: {
    color: Colors.dark.text, 
    fontSize: 32, 
    fontWeight: 'bold', 
    alignSelf: 'center', 
    marginBottom: 10
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.regular,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 1,
    alignSelf: 'center'
  },
  subtitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.regular,
    fontSize: 18,
    fontWeight: '700',
  },
  timer: {
     color: Colors.dark.text, fontSize: 42, fontWeight: '800', marginTop: 6 
  },
  kpiCard: { 
    flex: 1,
    backgroundColor: Colors.dark.card, 
    borderRadius: 14, 
    paddingVertical: 14, 
    alignItems: 'center', 
    marginRight: 12, 
  },
  kpiNumber: { 
      color: Colors.dark.text, 
      fontWeight: '800', 
      fontSize: 18, 
      marginBottom: 4 
  },
  kpiLabel: { 
    color: '#acb7c9ff', 
    fontSize: 12 
  },
  quickCard: { 
    flex: 1, 
    backgroundColor: Colors.dark.card, 
    borderRadius: 14, 
    paddingVertical: 18, 
    alignItems: 'center', 
    marginRight: 12,

  },
  text: {
    color: Colors.dark.text,
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  subtext: {
    color: Colors.dark.text,
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  textBold: {
    color: Colors.dark.text,
    fontFamily: Fonts.regular,
    fontSize: 16,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: '#222222',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
});
