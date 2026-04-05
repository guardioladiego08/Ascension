globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), {
  virtual: true,
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');

  return {
    useFocusEffect: (effect) => {
      React.useEffect(() => effect(), [effect]);
    },
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const createIcon = () => {
    const Icon = ({ name = 'icon', ...props }) => React.createElement(Text, props, name);
    Icon.glyphMap = {};
    return Icon;
  };

  return {
    Ionicons: createIcon(),
    MaterialCommunityIcons: createIcon(),
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockSvg = ({ children, ...props }) => React.createElement(View, props, children);

  return {
    __esModule: true,
    default: MockSvg,
    Circle: MockSvg,
  };
});

jest.mock('@/components/ui/AppPopup', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    __esModule: true,
    default: ({ visible, children, eyebrow, title, subtitle }) =>
      visible
        ? React.createElement(
            View,
            { testID: 'app-popup' },
            eyebrow ? React.createElement(Text, null, eyebrow) : null,
            title ? React.createElement(Text, null, title) : null,
            subtitle ? React.createElement(Text, null, subtitle) : null,
            children
          )
        : null,
  };
});
