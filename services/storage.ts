import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/constants/theme';

export interface MessageData {
    role: 'user' | 'assistant';
    content: string;
    image?: string;
    fileName?: string;
    fileUri?: string;
}

export interface ChatData {
    id: string;
    title: string;
    messages: MessageData[];
    createdAt: number;
    updatedAt: number;
}

export interface AppSettings {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    animationsEnabled: boolean;
    theme: ThemeMode;
    fontSize: 'small' | 'medium' | 'large';
    hapticFeedback: boolean;
    sendOnEnter: boolean;
    showTimestamps: boolean;
    accentColor: string;
    notificationsEnabled: boolean;
}

export interface AuthData {
    isAuthenticated: boolean;
    userName?: string;
    email?: string;
    appleUserId?: string;
}

export interface AdminNotification {
    id: string;
    title: string;
    body: string;
    timestamp: number;
    read: boolean;
}

export interface PersonalInfo {
    [key: string]: string; // key = вопрос, value = ответ
}

const CHATS_KEY = '@ai_chats';
const SETTINGS_KEY = '@ai_settings';
const ACTIVE_CHAT_KEY = '@ai_active_chat';
const AUTH_KEY = '@ai_auth';
const NOTIFICATIONS_KEY = '@ai_notifications';
const PUSH_TOKEN_KEY = '@ai_push_token';
const PERSONAL_INFO_KEY = '@ai_personal_info';

export const DEFAULT_SETTINGS: AppSettings = {
    model: 'openai/gpt-5-nano',
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: '',
    animationsEnabled: true,
    theme: 'dark',
    fontSize: 'medium',
    hapticFeedback: true,
    sendOnEnter: false,
    showTimestamps: false,
    accentColor: '#10a37f',
    notificationsEnabled: true,
};

export class StorageService {
    private static _uid: string = '';

    static setUserId(id: string) { this._uid = id; }

    private static k(base: string): string {
        return this._uid ? `${base}_${this._uid}` : base;
    }

    // ── Chats ──
    static async getChats(): Promise<ChatData[]> {
        try {
            const data = await AsyncStorage.getItem(this.k(CHATS_KEY));
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    }

    static async saveChat(chat: ChatData): Promise<void> {
        try {
            const chats = await this.getChats();
            const idx = chats.findIndex((c) => c.id === chat.id);
            if (idx >= 0) {
                chats[idx] = { ...chat, createdAt: chats[idx].createdAt, updatedAt: Date.now() };
            } else {
                chats.unshift({ ...chat, createdAt: Date.now(), updatedAt: Date.now() });
            }
            await AsyncStorage.setItem(this.k(CHATS_KEY), JSON.stringify(chats));
        } catch (e) { console.error('save chat:', e); }
    }

    static async deleteChat(id: string): Promise<void> {
        try {
            const chats = await this.getChats();
            await AsyncStorage.setItem(this.k(CHATS_KEY), JSON.stringify(chats.filter((c) => c.id !== id)));
        } catch (e) { console.error('delete chat:', e); }
    }

    static async clearAllChats(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([this.k(CHATS_KEY), this.k(ACTIVE_CHAT_KEY)]);
        } catch (e) { console.error('clear chats:', e); }
    }

    static async getActiveChatId(): Promise<string | null> {
        try { return await AsyncStorage.getItem(this.k(ACTIVE_CHAT_KEY)); }
        catch { return null; }
    }

    static async setActiveChatId(id: string): Promise<void> {
        try { await AsyncStorage.setItem(this.k(ACTIVE_CHAT_KEY), id); }
        catch (e) { console.error('set active:', e); }
    }

    // ── Settings ──
    static async getSettings(): Promise<AppSettings> {
        try {
            const data = await AsyncStorage.getItem(this.k(SETTINGS_KEY));
            return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
        } catch { return DEFAULT_SETTINGS; }
    }

    static async saveSettings(settings: AppSettings): Promise<void> {
        try { await AsyncStorage.setItem(this.k(SETTINGS_KEY), JSON.stringify(settings)); }
        catch (e) { console.error('save settings:', e); }
    }

    // ── Auth (global) ──
    static async getAuth(): Promise<AuthData | null> {
        try {
            const data = await AsyncStorage.getItem(AUTH_KEY);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    }

    static async saveAuth(auth: AuthData): Promise<void> {
        try { await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth)); }
        catch (e) { console.error('save auth:', e); }
    }

    static async clearAuth(): Promise<void> {
        try { await AsyncStorage.removeItem(AUTH_KEY); this._uid = ''; }
        catch (e) { console.error('clear auth:', e); }
    }

    // ── Notifications ──
    static async getNotifications(): Promise<AdminNotification[]> {
        try {
            const data = await AsyncStorage.getItem(this.k(NOTIFICATIONS_KEY));
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    }

    static async saveNotification(n: AdminNotification): Promise<void> {
        try {
            const all = await this.getNotifications();
            all.unshift(n);
            if (all.length > 50) all.length = 50;
            await AsyncStorage.setItem(this.k(NOTIFICATIONS_KEY), JSON.stringify(all));
        } catch (e) { console.error('save notif:', e); }
    }

    static async markNotificationRead(id: string): Promise<void> {
        try {
            const all = await this.getNotifications();
            const n = all.find(x => x.id === id);
            if (n) n.read = true;
            await AsyncStorage.setItem(this.k(NOTIFICATIONS_KEY), JSON.stringify(all));
        } catch (e) { console.error('mark read:', e); }
    }

    static async savePushToken(token: string): Promise<void> {
        try { await AsyncStorage.setItem(PUSH_TOKEN_KEY, token); }
        catch (e) { console.error('save token:', e); }
    }

    static async getPushToken(): Promise<string | null> {
        try { return await AsyncStorage.getItem(PUSH_TOKEN_KEY); }
        catch { return null; }
    }

    // ── Personal Info ──
    static async getPersonalInfo(): Promise<PersonalInfo> {
        try {
            const data = await AsyncStorage.getItem(this.k(PERSONAL_INFO_KEY));
            return data ? JSON.parse(data) : {};
        } catch { return {}; }
    }

    static async savePersonalInfo(info: PersonalInfo): Promise<void> {
        try { await AsyncStorage.setItem(this.k(PERSONAL_INFO_KEY), JSON.stringify(info)); }
        catch (e) { console.error('save personal info:', e); }
    }

    static async clearPersonalInfo(): Promise<void> {
        try { await AsyncStorage.removeItem(this.k(PERSONAL_INFO_KEY)); }
        catch (e) { console.error('clear personal info:', e); }
    }

    // ── Util ──
    static generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    static generateTitle(firstMessage: string): string {
        const t = firstMessage.trim();
        return t.length <= 40 ? t : t.substring(0, 40) + '...';
    }
}
