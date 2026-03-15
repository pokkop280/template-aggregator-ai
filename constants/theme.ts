export type ThemeMode = 'system' | 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  bgAlt: string;
  surface: string;
  border: string;
  text: string;
  textSec: string;
  textTer: string;
  accent: string;
  accentBg: string;
  danger: string;
  input: string;
  sidebarBg: string;
  overlay: string;
  cardBg: string;
  userAv: string;
  aiAv: string;
  headerBg: string;
  blurTint: 'dark' | 'light';
  statusBar: 'light' | 'dark';
}

export const darkColors: ThemeColors = {
  bg: '#0d0d0d',
  bgAlt: '#1a1a1a',
  surface: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  text: '#ececec',
  textSec: '#8e8e93',
  textTer: '#636366',
  accent: '#10a37f',
  accentBg: 'rgba(16,163,127,0.15)',
  danger: '#ef4444',
  input: '#1e1e1e',
  sidebarBg: 'rgba(10,10,15,0.92)',
  overlay: 'rgba(0,0,0,0.55)',
  cardBg: 'rgba(255,255,255,0.04)',
  userAv: '#3b82f6',
  aiAv: '#10a37f',
  headerBg: 'rgba(13,13,13,0.95)',
  blurTint: 'dark',
  statusBar: 'light',
};

export const lightColors: ThemeColors = {
  bg: '#ffffff',
  bgAlt: '#f7f7f8',
  surface: 'rgba(0,0,0,0.03)',
  border: 'rgba(0,0,0,0.08)',
  text: '#202123',
  textSec: '#6e6e80',
  textTer: '#acacb4',
  accent: '#10a37f',
  accentBg: 'rgba(16,163,127,0.08)',
  danger: '#ef4444',
  input: '#f4f4f4',
  sidebarBg: 'rgba(245,245,245,0.96)',
  overlay: 'rgba(0,0,0,0.25)',
  cardBg: 'rgba(0,0,0,0.03)',
  userAv: '#3b82f6',
  aiAv: '#10a37f',
  headerBg: 'rgba(255,255,255,0.92)',
  blurTint: 'light',
  statusBar: 'dark',
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
};
