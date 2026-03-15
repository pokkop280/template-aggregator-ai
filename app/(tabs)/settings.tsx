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
    Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StorageService, type AppSettings, DEFAULT_SETTINGS } from '@/services/storage';
import { POPULAR_MODELS } from '@/services/openrouter';

export default function SettingsScreen() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [showModels, setShowModels] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadSettings();
        }, [])
    );

    const loadSettings = async () => {
        const s = await StorageService.getSettings();
        setSettings(s);
    };

    const updateSetting = async <K extends keyof AppSettings>(
        key: K,
        value: AppSettings[K]
    ) => {
        const updated = { ...settings, [key]: value };
        setSettings(updated);
        await StorageService.saveSettings(updated);
    };

    const resetSettings = () => {
        Alert.alert('Сбросить настройки?', 'Все параметры вернутся к значениям по умолчанию', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Сбросить',
                style: 'destructive',
                onPress: async () => {
                    setSettings(DEFAULT_SETTINGS);
                    await StorageService.saveSettings(DEFAULT_SETTINGS);
                },
            },
        ]);
    };

    const clearAllData = () => {
        Alert.alert('Удалить все данные?', 'Все чаты и настройки будут удалены', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить',
                style: 'destructive',
                onPress: async () => {
                    await StorageService.clearAllChats();
                    setSettings(DEFAULT_SETTINGS);
                    await StorageService.saveSettings(DEFAULT_SETTINGS);
                    Alert.alert('', 'Данные удалены');
                },
            },
        ]);
    };

    const tempSteps = [0, 0.1, 0.3, 0.5, 0.7, 1.0, 1.3, 1.5, 2.0];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Настройки</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Model Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Модель AI</Text>
                    <TouchableOpacity
                        style={styles.modelSelector}
                        onPress={() => setShowModels(!showModels)}
                    >
                        <Text style={styles.modelSelectorText}>
                            {POPULAR_MODELS.find((m) => m.id === settings.model)?.name ||
                                settings.model.split('/').pop()}
                        </Text>
                        <Text style={styles.modelArrow}>{showModels ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {showModels && (
                        <View style={styles.modelList}>
                            {POPULAR_MODELS.map((model) => (
                                <TouchableOpacity
                                    key={model.id}
                                    style={[
                                        styles.modelItem,
                                        settings.model === model.id && styles.modelItemActive,
                                    ]}
                                    onPress={() => {
                                        updateSetting('model', model.id);
                                        setShowModels(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.modelItemText,
                                            settings.model === model.id && styles.modelItemTextActive,
                                        ]}
                                    >
                                        {model.name}
                                    </Text>
                                    {settings.model === model.id && (
                                        <Text style={styles.modelCheck}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}

                            {/* Custom model input */}
                            <View style={styles.customModelRow}>
                                <TextInput
                                    style={styles.customModelInput}
                                    placeholder="Или введите ID модели..."
                                    placeholderTextColor="#8e8ea0"
                                    value={
                                        POPULAR_MODELS.find((m) => m.id === settings.model)
                                            ? ''
                                            : settings.model
                                    }
                                    onChangeText={(text) => {
                                        if (text.trim()) updateSetting('model', text.trim());
                                    }}
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Temperature */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Температура</Text>
                    <Text style={styles.sectionSubtext}>
                        Чем выше — тем креативнее, чем ниже — тем точнее
                    </Text>
                    <View style={styles.tempRow}>
                        {tempSteps.map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    styles.tempBtn,
                                    Math.abs(settings.temperature - t) < 0.01 && styles.tempBtnActive,
                                ]}
                                onPress={() => updateSetting('temperature', t)}
                            >
                                <Text
                                    style={[
                                        styles.tempBtnText,
                                        Math.abs(settings.temperature - t) < 0.01 && styles.tempBtnTextActive,
                                    ]}
                                >
                                    {t}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Max Tokens */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Максимум токенов</Text>
                    <Text style={styles.sectionSubtext}>Длина ответа (100-4000)</Text>
                    <View style={styles.tokenRow}>
                        {[256, 500, 1000, 2000, 4000].map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    styles.tempBtn,
                                    settings.maxTokens === t && styles.tempBtnActive,
                                ]}
                                onPress={() => updateSetting('maxTokens', t)}
                            >
                                <Text
                                    style={[
                                        styles.tempBtnText,
                                        settings.maxTokens === t && styles.tempBtnTextActive,
                                    ]}
                                >
                                    {t}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* System Prompt */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Системный промпт</Text>
                    <Text style={styles.sectionSubtext}>
                        Инструкции для AI, которые применяются к каждому чату
                    </Text>
                    <TextInput
                        style={styles.promptInput}
                        placeholder="Например: Ты дружелюбный помощник. Отвечай на русском."
                        placeholderTextColor="#8e8ea0"
                        value={settings.systemPrompt}
                        onChangeText={(text) => updateSetting('systemPrompt', text)}
                        multiline
                        maxLength={1000}
                    />
                </View>

                {/* Animations */}
                <View style={styles.section}>
                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Анимации сообщений</Text>
                            <Text style={styles.sectionSubtext}>
                                Плавное появление новых сообщений
                            </Text>
                        </View>
                        <Switch
                            value={settings.animationsEnabled}
                            onValueChange={(v) => updateSetting('animationsEnabled', v)}
                            trackColor={{ false: '#d0d0d0', true: '#10a37f' }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.actionBtn} onPress={resetSettings}>
                        <Text style={styles.actionBtnText}>🔄 Сбросить настройки</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.dangerBtn]}
                        onPress={clearAllData}
                    >
                        <Text style={[styles.actionBtnText, styles.dangerText]}>
                            🗑️ Удалить все данные
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.infoText}>My AI Client v1.0</Text>
                    <Text style={styles.infoText}>Powered by OpenRouter</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ececf1',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '600', color: '#202123' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
    section: {
        backgroundColor: '#f7f7f8',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#ececf1',
    },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#202123', marginBottom: 4 },
    sectionSubtext: { fontSize: 13, color: '#6e6e80', marginBottom: 12 },
    modelSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ececf1',
        marginTop: 8,
    },
    modelSelectorText: { fontSize: 15, color: '#202123', fontWeight: '500' },
    modelArrow: { fontSize: 12, color: '#8e8ea0' },
    modelList: { marginTop: 8, gap: 4 },
    modelItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    modelItemActive: { backgroundColor: '#e8f5e9' },
    modelItemText: { fontSize: 14, color: '#353740' },
    modelItemTextActive: { color: '#10a37f', fontWeight: '600' },
    modelCheck: { color: '#10a37f', fontSize: 16, fontWeight: 'bold' },
    customModelRow: { marginTop: 4 },
    customModelInput: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        fontSize: 14,
        color: '#202123',
        borderWidth: 1,
        borderColor: '#ececf1',
    },
    tempRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tokenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tempBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ececf1',
    },
    tempBtnActive: { backgroundColor: '#10a37f', borderColor: '#10a37f' },
    tempBtnText: { fontSize: 14, color: '#353740', fontWeight: '500' },
    tempBtnTextActive: { color: '#fff' },
    promptInput: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: '#202123',
        minHeight: 80,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#ececf1',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    actionBtn: {
        padding: 14,
        borderRadius: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#ececf1',
    },
    actionBtnText: { fontSize: 15, color: '#202123', fontWeight: '500' },
    dangerBtn: { borderColor: '#ffcdd2' },
    dangerText: { color: '#e53935' },
    infoSection: { alignItems: 'center', paddingVertical: 16 },
    infoText: { fontSize: 13, color: '#8e8ea0', marginBottom: 4 },
});
