export const colors = {
  dark: {
    background: '#121214',
    card: '#1A1A1E',
    cardBorder: '#27272A',
    text: '#F4F4F5',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    primary: '#FF5533', // Terracotta Gamer
    primaryHover: '#E04828',
    accent: '#F5A623', // Amber Checkpoint
    success: '#10B981', // Emerald Cleared
    warning: '#F59E0B',
    danger: '#EF4444',
    border: '#27272A',
    inputBg: '#202024',
    tabBarBg: '#161619',
    tabBarActive: '#FF5533',
    tabBarInactive: '#71717A',
  },
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    primary: '#E04828',
    primaryHover: '#C2381B',
    accent: '#D97706',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    border: '#E2E8F0',
    inputBg: '#F1F5F9',
    tabBarBg: '#FFFFFF',
    tabBarActive: '#E04828',
    tabBarInactive: '#64748B',
  },
};

export const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  backlog: { bg: '#27272A', text: '#D4D4D8', label: 'Backlog' },
  playing: { bg: '#3B1812', text: '#FF7A59', label: 'Jogando' },
  paused: { bg: '#332710', text: '#FBBF24', label: 'Pausado' },
  beaten: { bg: '#062E20', text: '#34D399', label: 'Zerado' },
  completed: { bg: '#1E1B4B', text: '#A78BFA', label: '100%' },
  abandoned: { bg: '#2B1214', text: '#F87171', label: 'Abandonado' },
};
