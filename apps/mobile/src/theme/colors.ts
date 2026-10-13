export const colors = {
  dark: {
    background: '#11110F', // Warm black, like a dark game room
    surface: '#191816',
    card: '#211F1B',
    cardBorder: '#39352E',
    border: '#2D2A24',
    inputBg: '#151412',
    text: '#F7F2E9',
    textSecondary: '#B7B0A4',
    textMuted: '#817A6E',
    primary: '#EE7658', // Terracotta
    primaryHover: '#D76045',
    accent: '#E7B45D', // Amber
    accentPurple: '#B49AE2',
    gold: '#E7B45D',
    success: '#80B78D',
    warning: '#E3A952',
    danger: '#D97369',
    tabBarBg: '#141311',
    tabBarActive: '#EE7658',
    tabBarInactive: '#817A6E',
  },
  light: {
    background: '#F1EEE7',
    surface: '#E7E2D8',
    card: '#FAF8F2',
    cardBorder: '#D8D0C2',
    border: '#DED8CE',
    inputBg: '#FFFEFA',
    text: '#211F1B',
    textSecondary: '#5F5A51',
    textMuted: '#847D71',
    primary: '#C8583F',
    primaryHover: '#A9432D',
    accent: '#A66C18',
    accentPurple: '#72599D',
    gold: '#A66C18',
    success: '#3F8051',
    warning: '#A66C18',
    danger: '#B8483F',
    tabBarBg: '#FAF8F2',
    tabBarActive: '#C8583F',
    tabBarInactive: '#847D71',
  },
};

export const statusColors: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  playing: {
    bg: '#33201A',
    text: '#F39A7B',
    border: '#684034',
    label: 'Jogando',
  },
  backlog: {
    bg: '#28261F',
    text: '#E7B45D',
    border: '#55482F',
    label: 'Backlog',
  },
  paused: {
    bg: '#30271A',
    text: '#E8BD71',
    border: '#5C482B',
    label: 'Pausado',
  },
  beaten: {
    bg: '#202B22',
    text: '#9BC7A0',
    border: '#3C5840',
    label: 'Zerado',
  },
  completed: {
    bg: '#2B2430',
    text: '#C8AFE9',
    border: '#544564',
    label: '100%',
  },
  abandoned: {
    bg: '#30201F',
    text: '#E39A91',
    border: '#5D3835',
    label: 'Abandonado',
  },
};
