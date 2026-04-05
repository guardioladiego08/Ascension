import * as React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { MonoText } from '../no mine/StyledText';

jest.mock('../no mine/Themed', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Text: ({ children, ...props }) => React.createElement(Text, props, children),
  };
});

it(`renders correctly`, () => {
  let tree;

  act(() => {
    tree = renderer.create(<MonoText>Snapshot test!</MonoText>);
  });

  const text = tree.root.findByType(Text);

  expect(text.props.children).toBe('Snapshot test!');
  expect(text.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ fontFamily: 'SpaceMono' })])
  );
});
