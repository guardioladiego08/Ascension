import { createHomeStyles } from '@/app/(tabs)/home/styles';

export const mockTheme = {
  colors: {
    text: '#F5F7FA',
    blkText: '#06080B',
    highlight1: '#2ECC71',
    highlight2: '#4CC9F0',
    highlight3: '#FF8C42',
    accentSoft: 'rgba(46, 204, 113, 0.16)',
    accentSecondarySoft: 'rgba(76, 201, 240, 0.16)',
    accentTertiarySoft: 'rgba(255, 140, 66, 0.16)',
  },
  fonts: {
    display: 'DisplayFont',
    heading: 'HeadingFont',
    label: 'LabelFont',
    body: 'BodyFont',
    mono: 'MonoFont',
    regular: 'BodyFont',
    bold: 'DisplayFont',
  },
};

export const mockHomeStyles = createHomeStyles(mockTheme.colors, mockTheme.fonts);
