import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StorageService, type AppSettings, DEFAULT_SETTINGS, type PersonalInfo } from '@/services/storage';
import { useAppTheme } from './_layout';
import type { ThemeMode } from '@/constants/theme';

const ACCENT_COLORS = [
  '#10a37f', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f97316', '#ef4444', '#eab308', '#06b6d4',
  '#14b8a6', '#6366f1', '#f43f5e', '#84cc16',
];

export default function SettingsModal() {
  const router = useRouter();
  const { colors, mode, setMode, setAccent } = useAppTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [userName, setUserName] = useState('');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({});

  useFocusEffect(useCallback(() => {
    (async () => {
      setSettings(await StorageService.getSettings());
      const auth = await StorageService.getAuth();
      setUserName(auth?.userName || 'User');
      setPersonalInfo(await StorageService.getPersonalInfo());
    })();
  }, []));

  const update = async <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    const u = { ...settings, [key]: val };
    setSettings(u);
    await StorageService.saveSettings(u);
  };

  const openSystemSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const signOut = () => {
    Alert.alert('Выйти из аккаунта?', 'Данные аккаунта останутся при повторном входе', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: async () => { await StorageService.clearAuth(); router.replace('/auth'); } },
    ]);
  };

  const themeOpts: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'system', label: 'Системная', icon: 'phone-portrait-outline' },
    { key: 'dark', label: 'Тёмная', icon: 'moon-outline' },
    { key: 'light', label: 'Светлая', icon: 'sunny-outline' },
  ];

  const fontSizes: { key: AppSettings['fontSize']; label: string }[] = [
    { key: 'small', label: 'Мелкий' },
    { key: 'medium', label: 'Средний' },
    { key: 'large', label: 'Крупный' },
  ];

  const tempSteps = [0, 0.3, 0.5, 0.7, 1.0, 1.5, 2.0];

  const clearPersonalInfoData = () => {
    Alert.alert('Удалить всю информацию?', 'Все ваши ответы будут удалены', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          setPersonalInfo({});
          await StorageService.clearPersonalInfo();
        }
      },
    ]);
  };

  const Sec = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>{children}</View>
  );
  const Row = ({ icon, label, right }: { icon: keyof typeof Ionicons.glyphMap; label: string; right: React.ReactNode }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={colors.accent} />
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {right}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Настройки</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.userSec}>
          <View style={[styles.userAv, { backgroundColor: colors.accent }]}>
            <Text style={styles.userAvTxt}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.userN, { color: colors.text }]}>{userName}</Text>
        </View>

        {/* ═══ Appearance ═══ */}
        <Text style={[styles.groupTitle, { color: colors.textTer }]}>ВНЕШНИЙ ВИД</Text>

        <Sec>
          <Text style={[styles.secTitle, { color: colors.text }]}>Тема оформления</Text>
          <View style={styles.themeRow}>
            {themeOpts.map((t) => (
              <TouchableOpacity key={t.key} style={[styles.themeBtn, { borderColor: mode === t.key ? colors.accent : colors.border, backgroundColor: mode === t.key ? colors.accentBg : 'transparent' }]} onPress={() => setMode(t.key)} activeOpacity={0.7}>
                <Ionicons name={t.icon} size={20} color={mode === t.key ? colors.accent : colors.textSec} />
                <Text style={[styles.themeTxt, { color: mode === t.key ? colors.accent : colors.textSec }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Sec>

        <Sec>
          <Text style={[styles.secTitle, { color: colors.text }]}>Акцентный цвет</Text>
          <View style={styles.colorGrid}>
            {ACCENT_COLORS.map((c) => (
              <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c, borderColor: settings.accentColor === c ? '#fff' : 'transparent' }]} onPress={() => { update('accentColor', c); setAccent(c); }} activeOpacity={0.7}>
                {settings.accentColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </Sec>

        <Sec>
          <Text style={[styles.secTitle, { color: colors.text }]}>Размер шрифта</Text>
          <View style={styles.themeRow}>
            {fontSizes.map((f) => (
              <TouchableOpacity key={f.key} style={[styles.themeBtn, { borderColor: settings.fontSize === f.key ? colors.accent : colors.border, backgroundColor: settings.fontSize === f.key ? colors.accentBg : 'transparent' }]} onPress={() => update('fontSize', f.key)} activeOpacity={0.7}>
                <Text style={[styles.fontPreview, { color: settings.fontSize === f.key ? colors.accent : colors.textSec, fontSize: f.key === 'small' ? 12 : f.key === 'medium' ? 15 : 18 }]}>Аа</Text>
                <Text style={[styles.themeTxt, { color: settings.fontSize === f.key ? colors.accent : colors.textSec }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Sec>

        {/* ═══ Chat ═══ */}
        <Text style={[styles.groupTitle, { color: colors.textTer }]}>ЧАТ</Text>

        <Sec>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="document-text-outline" size={18} color={colors.accent} />
            <Text style={[styles.secTitle, { color: colors.text, marginBottom: 0 }]}>Системный промпт</Text>
          </View>
          <Text style={[styles.secSub, { color: colors.textTer }]}>Инструкции для AI в каждом чате</Text>
          <TextInput
            style={[styles.promptInput, { backgroundColor: colors.surface, color: colors.text }]}
            placeholder="Например: Отвечай кратко и на русском"
            placeholderTextColor={colors.textTer}
            value={settings.systemPrompt}
            onChangeText={(t) => update('systemPrompt', t)}
            multiline maxLength={1000}
          />
        </Sec>

        <Sec>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="thermometer-outline" size={18} color={colors.accent} />
            <Text style={[styles.secTitle, { color: colors.text, marginBottom: 0 }]}>Креативность</Text>
          </View>
          <Text style={[styles.secSub, { color: colors.textTer }]}>Выше — креативнее, ниже — точнее</Text>
          <View style={styles.chipRow}>
            {tempSteps.map((t) => {
              const active = Math.abs(settings.temperature - t) < 0.01;
              return (
                <TouchableOpacity key={t} style={[styles.chip, { backgroundColor: active ? colors.accent : colors.surface }]} onPress={() => update('temperature', t)}>
                  <Text style={[styles.chipTxt, { color: active ? '#fff' : colors.textSec }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Sec>

        {/* ═══ Behavior ═══ */}
        <Text style={[styles.groupTitle, { color: colors.textTer }]}>ПОВЕДЕНИЕ</Text>

        <Sec><Row icon="return-down-back-outline" label="Отправка по Enter" right={<Switch value={settings.sendOnEnter} onValueChange={(v) => update('sendOnEnter', v)} trackColor={{ false: colors.surface, true: colors.accent }} thumbColor="#fff" />} /></Sec>
        <Sec><Row icon="hand-left-outline" label="Тактильный отклик" right={<Switch value={settings.hapticFeedback} onValueChange={(v) => update('hapticFeedback', v)} trackColor={{ false: colors.surface, true: colors.accent }} thumbColor="#fff" />} /></Sec>
        <Sec><Row icon="time-outline" label="Время сообщений" right={<Switch value={settings.showTimestamps} onValueChange={(v) => update('showTimestamps', v)} trackColor={{ false: colors.surface, true: colors.accent }} thumbColor="#fff" />} /></Sec>

        {/* ═══ Notifications ═══ */}
        <Text style={[styles.groupTitle, { color: colors.textTer }]}>УВЕДОМЛЕНИЯ</Text>

        <Sec>
          <Row icon="notifications-outline" label="Уведомления" right={<Switch value={settings.notificationsEnabled} onValueChange={async (v) => {
            if (!v) { update('notificationsEnabled', false); return; }
            // Check permission before enabling
            try {
              const Notifications = require('expo-notifications');
              const { status: current } = await Notifications.getPermissionsAsync();
              if (current === 'granted') { update('notificationsEnabled', true); return; }
              const { status } = await Notifications.requestPermissionsAsync();
              if (status === 'granted') { update('notificationsEnabled', true); }
              else {
                Alert.alert(
                  'Нет разрешения',
                  'Чтобы получать уведомления, разрешите их в настройках устройства.',
                  [{ text: 'Отмена', style: 'cancel' }, { text: 'Открыть настройки', onPress: openSystemSettings }]
                );
              }
            } catch {
              // expo-notifications not available, just toggle
              update('notificationsEnabled', v);
            }
          }} trackColor={{ false: colors.surface, true: colors.accent }} thumbColor="#fff" />} />
          {!settings.notificationsEnabled && (
            <TouchableOpacity style={[styles.linkBtn, { backgroundColor: colors.surface }]} onPress={openSystemSettings}>
              <Ionicons name="open-outline" size={16} color={colors.accent} />
              <Text style={[styles.linkTxt, { color: colors.accent }]}>Открыть настройки устройства</Text>
            </TouchableOpacity>
          )}
        </Sec>

        {/* ═══ Get to know you ═══ */}
        <Text style={[styles.groupTitle, { color: colors.textTer }]}>ПЕРСОНАЛИЗАЦИЯ</Text>

        <Sec>
          <TouchableOpacity
            style={[styles.personalizeBtn, { backgroundColor: colors.surface }]}
            onPress={() => { router.push('/personalize'); }}
            activeOpacity={0.7}
          >
            <View style={styles.personalizeBtnLeft}>
              <Ionicons name="people-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.personalizeBtnTitle, { color: colors.text }]}>Давайте познакомимся</Text>
                <Text style={[styles.personalizeBtnSub, { color: colors.textTer }]}>
                  {Object.keys(personalInfo).length > 0
                    ? `Заполнено ${Object.keys(personalInfo).length}/15 вопросов`
                    : 'Расскажите о себе, чтобы AI лучше вас понимал'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTer} />
          </TouchableOpacity>
          {Object.keys(personalInfo).length > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.08)', marginTop: 10 }]}
              onPress={clearPersonalInfoData}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[styles.actionTxt, { color: colors.danger }]}>Удалить всю информацию</Text>
            </TouchableOpacity>
          )}
        </Sec>

        {/* ═══ Data ═══ */}
        <Text style={[styles.groupTitle, { color: colors.textTer }]}>ДАННЫЕ</Text>

        <Sec>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => {
            Alert.alert('Сбросить настройки?', '', [{ text: 'Нет', style: 'cancel' }, {
              text: 'Да', style: 'destructive', onPress: async () => {
                const def = { ...DEFAULT_SETTINGS, theme: settings.theme };
                setSettings(def); await StorageService.saveSettings(def); setAccent('#10a37f');
              }
            }]);
          }}>
            <Ionicons name="refresh-outline" size={18} color={colors.text} />
            <Text style={[styles.actionTxt, { color: colors.text }]}>Сбросить настройки</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.08)' }]} onPress={() => {
            Alert.alert('Удалить все чаты?', 'Это нельзя отменить', [{ text: 'Нет', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: () => StorageService.clearAllChats() }]);
          }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.actionTxt, { color: colors.danger }]}>Удалить все чаты</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.08)' }]} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={[styles.actionTxt, { color: colors.danger }]}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </Sec>

        <Text style={[styles.ver, { color: colors.textTer }]}>{'\u00A9'} Все права защищены</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 40 },
  userSec: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  userAv: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  userAvTxt: { fontSize: 22, fontWeight: '700', color: '#fff' },
  userN: { fontSize: 17, fontWeight: '600' },
  groupTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 6, marginLeft: 4, marginBottom: 2 },
  section: { borderRadius: 14, padding: 14, borderWidth: 1 },
  secTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  secSub: { fontSize: 13, marginBottom: 10 },
  themeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  themeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, gap: 4 },
  themeTxt: { fontSize: 11, fontWeight: '600' },
  fontPreview: { fontWeight: '700' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  colorDot: { width: 38, height: 38, borderRadius: 19, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  chipTxt: { fontSize: 14, fontWeight: '500' },
  promptInput: { borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 10 },
  linkTxt: { fontSize: 14, fontWeight: '500' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 12, marginBottom: 6 },
  actionTxt: { fontSize: 15, fontWeight: '500' },
  personalizeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14 },
  personalizeBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  personalizeBtnTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  personalizeBtnSub: { fontSize: 13, lineHeight: 18 },
  ver: { fontSize: 12, textAlign: 'center', paddingTop: 12 },
});
