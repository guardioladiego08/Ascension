// app/constants/GlobalStyles.ts
import { StyleSheet } from 'react-native';
import { Colors } from './Colors';
import { Fonts } from './Fonts';

export const GlobalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 15
  },
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: Colors.dark.background,
  },
  header: {
    color: Colors.dark.text, 
    fontSize: 32, 
    fontWeight: 'bold', 
    alignSelf: 'center', 
    marginVertical: 2
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
