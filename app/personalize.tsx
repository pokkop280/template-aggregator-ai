import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StorageService, type PersonalInfo } from '@/services/storage';
import { useAppTheme } from './_layout';

const QUESTIONS = [
  'Как вас зовут?',
  'Сколько вам лет?',
  'Чем вы занимаетесь?',
  'Какие у вас хобби?',
  'Какая ваша любимая книга?',
  'Какой ваш любимый фильм?',
  'Какая ваша любимая музыка?',
  'Где вы живете?',
  'Какие языки вы знаете?',
  'Какие у вас цели в жизни?',
  'Что вас вдохновляет?',
  'Какое ваше любимое место?',
  'Какая ваша любимая еда?',
  'Есть ли у вас домашние животные?',
  'О чем бы вы хотели поговорить с AI?',
];

export default function PersonalizeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      setPersonalInfo(await StorageService.getPersonalInfo());
    })();
  }, []));

  const updateAnswer = (question: string, answer: string) => {
    setPersonalInfo(prev => ({ ...prev, [question]: answer }));
  };

  const saveInfo = async () => {
    setSaving(true);
    try {
      await StorageService.savePersonalInfo(personalInfo);
      Alert.alert('✅ Сохранено', 'Информация о вас сохранена. Теперь AI будет лучше вас понимать!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось сохранить информацию');
    } finally {
      setSaving(false);
    }
  };

  const filledCount = Object.values(personalInfo).filter(v => v.trim()).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Давайте познакомимся</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.textSec }]}>
            Расскажите о себе, чтобы AI лучше понимал вас и давал более персонализированные ответы
          </Text>
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            Заполнено: {filledCount}/{QUESTIONS.length}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${(filledCount / QUESTIONS.length) * 100}%` }]} />
          </View>
        </View>

        {QUESTIONS.map((q, i) => (
          <View key={i} style={[styles.questionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.questionNumber, { color: colors.accent }]}>Вопрос {i + 1}</Text>
            <Text style={[styles.questionText, { color: colors.text }]}>{q}</Text>
            <TextInput
              style={[styles.answerInput, { backgroundColor: colors.surface, color: colors.text, borderColor: personalInfo[q]?.trim() ? colors.accent : colors.border }]}
              placeholder="Ваш ответ..."
              placeholderTextColor={colors.textTer}
              value={personalInfo[q] || ''}
              onChangeText={(text) => updateAnswer(q, text)}
              multiline
              numberOfLines={3}
            />
          </View>
        ))}
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
          onPress={saveInfo}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? 'Сохранение...' : 'Сохранить'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  progressCard: { padding: 16, borderRadius: 14, marginBottom: 20 },
  progressText: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  questionCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  questionNumber: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  questionText: { fontSize: 15, fontWeight: '600', marginBottom: 12, lineHeight: 22 },
  answerInput: { borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1.5 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
