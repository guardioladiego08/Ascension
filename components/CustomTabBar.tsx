// components/CustomTabBar.tsx
import { AntDesign } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors'; // Adjust if needed


const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <SafeAreaView style={styles.wrapper} edges={['bottom']}>
        <View style={styles.tabBar}>
        {['home', 'new', 'stats'].map((routeName) => {
            const index = state.routes.findIndex((r) => r.name === routeName);
            if (index === -1) return null;

            const route = state.routes[index];
            const isFocused = state.index === index;

            const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key });
                if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
                }
            };

            let iconName: keyof typeof AntDesign.glyphMap;

            switch (route.name) {
                case 'home':
                iconName = 'home';
                break;
                case 'new':
                iconName = 'plus';
                break;
                case 'stats':
                iconName = 'piechart';
                break;
                default:
                iconName = 'question';
            }

            return (
                <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabButton}
                >
                <AntDesign
                    name={iconName}
                    size={30}
                    color={isFocused ? Colors.highlight1 : Colors.text}
                />
                </TouchableOpacity>
            );
            })}
        </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tabBar: {
  flexDirection: 'row',
  backgroundColor: Colors.tab,
  height: 70, // was 100
  justifyContent: 'space-evenly',
  alignItems: 'center',
  paddingBottom: 10, // helps with safe area
},

  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  centerButton: {
  position: 'absolute',
  top: -0,              // slightly less floating
  left: '50%',
  transform: [{ translateX: -16 }],
  backgroundColor: Colors.highlight1,
  borderRadius: 30,
  width: 32,
  height: 32,
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
},


  centerIcon: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
});

export default CustomTabBar;
