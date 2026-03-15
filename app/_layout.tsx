import { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { StorageService } from '@/services/storage';
import { type ThemeMode, type ThemeColors, darkColors, lightColors, hexToRgba } from '@/constants/theme';

interface ThemeCtx {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  setAccent: (c: string) => void;
}

export const ThemeContext = createContext<ThemeCtx>({
  colors: darkColors,
  isDark: true,
  mode: 'dark',
  setMode: () => { },
  setAccent: () => { },
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColor] = useState('#10a37f');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const auth = await StorageService.getAuth();
      if (auth?.appleUserId) StorageService.setUserId(auth.appleUserId);
      else if (auth?.userName) StorageService.setUserId(auth.userName);
      const s = await StorageService.getSettings();
      setThemeMode(s.theme || 'dark');
      setAccentColor(s.accentColor || '#10a37f');
      setReady(true);
    })();
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setThemeMode(m);
    const s = await StorageService.getSettings();
    await StorageService.saveSettings({ ...s, theme: m });
  }, []);

  const setAccent = useCallback(async (c: string) => {
    setAccentColor(c);
    const s = await StorageService.getSettings();
    await StorageService.saveSettings({ ...s, accentColor: c });
  }, []);

  const theme = useMemo<ThemeCtx>(() => {
    const isDark = themeMode === 'system' ? systemScheme !== 'light' : themeMode === 'dark';
    const base = isDark ? darkColors : lightColors;
    const colors: ThemeColors = {
      ...base,
      accent: accentColor,
      accentBg: hexToRgba(accentColor, 0.15),
      aiAv: accentColor,
    };
    return { colors, isDark, mode: themeMode, setMode, setAccent };
  }, [themeMode, systemScheme, accentColor, setMode, setAccent]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#10a37f" />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={theme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ animation: 'fade' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={theme.colors.statusBar} />
    </ThemeContext.Provider>
  );
}
