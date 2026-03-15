export const HOME_TONES = {
  background: '#070809',
  backgroundRaised: '#0B0D10',
  surface1: '#111317',
  surface2: '#171A1F',
  surface3: '#1E232A',
  border: '#2A3039',
  borderSoft: 'rgba(58, 65, 74, 0.68)',
  textPrimary: '#F5F7FA',
  textSecondary: '#B8C0CA',
  textTertiary: '#8D97A3',
  textDisabled: '#5F6772',
  chipBg: '#161A1F',
  panelOverlay: 'rgba(255, 255, 255, 0.03)',
  panelOverlayStrong: 'rgba(255, 255, 255, 0.05)',
} as const;

export type HomeTones = typeof HOME_TONES;
