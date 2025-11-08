// components/CustomTabBar.tsx
import { AntDesign } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePathname } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  // get the current path, e.g. "/new", "/new/strength-train", etc.
  const pathname = usePathname() ?? '';

  return (
    <SafeAreaView style={styles.wrapper} edges={['bottom']}>
      <View style={styles.tabBar}>
        {['home', 'progress', 'social', 'profile'].map((routeName) => {
          const index = state.routes.findIndex(r => r.name === routeName);
          if (index === -1) return null;

          // For "new" tab: highlight whenever we're anywhere under /new
          const isNewTab = routeName === 'new';
          const isFocused = isNewTab
            ? pathname.startsWith('/new')
            : state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[index].key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(state.routes[index].name);
            }
          };

          let iconName: keyof typeof AntDesign.glyphMap;
          switch (routeName) {
            case 'home':
              iconName = 'home';
              break;
            case 'progress':
              iconName = 'pie-chart';
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
              key={routeName}
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
    zIndex: 10
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.tab,
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