// components/CustomTabBar.tsx
import { AntDesign } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  // Desired order of tabs
  const ordered = ['home', 'progress', 'social', 'profile'];

  console.log('[TabBar] routes:', state.routes.map(r => r.name));

  return (
    <SafeAreaView style={styles.wrapper} edges={['bottom']}>
      <View style={styles.tabBar}>
        {ordered.map((routeName) => {
          const index = state.routes.findIndex(r => r.name === routeName);
          if (index === -1) return null; // this tab doesn't exist in navigator

          const route = state.routes[index];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName: keyof typeof AntDesign.glyphMap;
          switch (routeName) {
            case 'home':
              iconName = 'home';
              break;
            case 'progress':
              iconName = 'pie-chart'; // AntDesign name
              break;
            case 'social':
              iconName = 'team';
              break;
            case 'profile':
              iconName = 'user';
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
                color={isFocused ? Colors.dark.highlight1 : Colors.dark.text}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

export default CustomTabBar;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.dark.background,
    zIndex: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    height: 70,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
