import renderer, { act } from 'react-test-renderer';

import { mockHomeStyles, mockTheme } from './mockTheme';

export const theme = mockTheme;
export const homeStyles = mockHomeStyles;

export async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function flattenText(children) {
  if (Array.isArray(children)) {
    return children.map(flattenText).join('');
  }

  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }

  if (children == null) {
    return '';
  }

  return '';
}

export function findFirstNodeByText(root, text) {
  const matches = root.findAll(
    (node) => flattenText(node.props?.children) === text
  );

  if (!matches.length) {
    throw new Error(`Unable to find node with text: ${text}`);
  }

  return matches[0];
}

export function pressByText(tree, text) {
  let node = findFirstNodeByText(tree.root, text);

  while (node && typeof node.props?.onPress !== 'function') {
    node = node.parent;
  }

  if (!node) {
    throw new Error(`Unable to find pressable ancestor for text: ${text}`);
  }

  act(() => {
    node.props.onPress();
  });
}

export async function pressByTextAsync(tree, text) {
  let node = findFirstNodeByText(tree.root, text);

  while (node && typeof node.props?.onPress !== 'function') {
    node = node.parent;
  }

  if (!node) {
    throw new Error(`Unable to find pressable ancestor for text: ${text}`);
  }

  await act(async () => {
    await node.props.onPress();
  });
}

export async function renderAsync(element) {
  let tree;

  await act(async () => {
    tree = renderer.create(element);
  });

  return tree;
}
