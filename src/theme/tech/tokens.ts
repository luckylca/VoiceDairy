export const techTokens = {
  colors: {
    background: '#071018',
    backgroundDeep: '#03080D',
    surface: '#0C1822',
    surfaceRaised: '#112431',
    surfaceGlass: 'rgba(18, 42, 56, 0.78)',
    primary: '#55D9FF',
    primaryStrong: '#00BCEB',
    secondary: '#8E7CFF',
    success: '#52E6B8',
    warning: '#FFB86A',
    error: '#FF6F7D',
    text: '#DCECF3',
    textMuted: '#8FA8B5',
    line: 'rgba(119, 193, 221, 0.18)',
    glow: 'rgba(70, 208, 255, 0.24)',
    glowSecondary: 'rgba(142, 124, 255, 0.18)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    pill: 999,
  },
  typography: {
    title: 28,
    heading: 20,
    body: 15,
    label: 12,
  },
  shadows: {
    panel: {
      shadowColor: '#000000',
      shadowOpacity: 0.34,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  },
  glow: {
    soft: 14,
    strong: 24,
  },
  animation: {
    micro: 150,
    normal: 260,
    expressive: 520,
    ambient: 4200,
  },
} as const;

export type TechTokens = typeof techTokens;
