import { AntDesign } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/providers/AppThemeProvider';

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const ordered = ['home', 'progress', 'social', 'profile'];

  return (
    <SafeAreaView style={styles.wrapper} edges={['bottom']}>
      <View style={styles.tabBar}>
        {ordered.map((routeName) => {
          const index = state.routes.findIndex((route) => route.name === routeName);
          if (index === -1) return null;

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
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.88}
            >
              <View style={[styles.iconWrap, isFocused ? styles.iconWrapActive : null]}>
                <AntDesign
                  name={iconName}
                  size={24}
                  color={isFocused ? colors.highlight1 : colors.textMuted}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: -30,
      backgroundColor: colors.background,
      zIndex: 10,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      height: 72,
      justifyContent: 'space-evenly',
      alignItems: 'center',
      paddingBottom: 10,
      paddingHorizontal: 8,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrap: {
      width: 50,
      height: 42,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    iconWrapActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.border,
    },
  });
}

export default CustomTabBar;
