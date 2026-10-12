export const colors = {
  dark: {
    background: '#0C1017', // Deep obsidian charcoal/navy base
    surface: '#151B26',    // Slate navy surface
    card: '#1A2230',       // Game card background
    cardBorder: '#283548', // Subtle elegant card border
    border: '#222D3D',     // Divider border
    inputBg: '#111620',    // Elevated text input background
    text: '#F8FAFC',       // Pure high-contrast readable white
    textSecondary: '#94A3B8', // Cool slate gray for subtitles/genres
    textMuted: '#64748B',  // Muted gray for timestamps and placeholders
    primary: '#FF643D',    // Warm ember orange accent
    primaryHover: '#E5522D',
    accent: '#38BDF8',     // Crystal cyan / checkpoint accent
    accentPurple: '#A855F7',
    gold: '#FBBF24',       // Achievement gold
    success: '#10B981',    // Emerald cleared
    warning: '#F59E0B',
    danger: '#EF4444',     // Crimson alert
    tabBarBg: '#0E131C',   // Deep slate navbar
    tabBarActive: '#FF643D',
    tabBarInactive: '#64748B',
  },
  light: {
    background: '#F1F5F9',
    surface: '#E2E8F0',
    card: '#FFFFFF',
    cardBorder: '#CBD5E1',
    border: '#E2E8F0',
    inputBg: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    primary: '#E5522D',
    primaryHover: '#C23E1E',
    accent: '#0284C7',
    accentPurple: '#9333EA',
    gold: '#D97706',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    tabBarBg: '#FFFFFF',
    tabBarActive: '#E5522D',
    tabBarInactive: '#64748B',
  },
};

export const statusColors: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  playing: {
    bg: '#2C1510',
    text: '#FF8A65',
    border: '#5C271C',
    label: 'Jogando',
  },
  backlog: {
    bg: '#142132',
    text: '#7DD3FC',
    border: '#233852',
    label: 'Backlog',
  },
  paused: {
    bg: '#2A1F10',
    text: '#FDE047',
    border: '#4D371A',
    label: 'Pausado',
  },
  beaten: {
    bg: '#0F291E',
    text: '#6EE7B7',
    border: '#1E4B37',
    label: 'Zerado',
  },
  completed: {
    bg: '#241433',
    text: '#D8B4FE',
    border: '#482468',
    label: '100%',
  },
  abandoned: {
    bg: '#2A1417',
    text: '#FCA5A5',
    border: '#4E2127',
    label: 'Abandonado',
  },
};
