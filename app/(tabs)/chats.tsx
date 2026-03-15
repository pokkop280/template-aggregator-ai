import { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
} from 'react-native';
import Animated, { FadeInRight, FadeOut } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { StorageService, type ChatData } from '@/services/storage';

export default function ChatsScreen() {
    const [chats, setChats] = useState<ChatData[]>([]);
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            loadChats();
        }, [])
    );

    const loadChats = async () => {
        const data = await StorageService.getChats();
        setChats(data);
    };

    const openChat = async (chat: ChatData) => {
        await StorageService.setActiveChatId(chat.id);
        router.navigate('/(tabs)');
    };

    const deleteChat = (chat: ChatData) => {
        Alert.alert('Удалить чат?', `"${chat.title}"`, [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить',
                style: 'destructive',
                onPress: async () => {
                    await StorageService.deleteChat(chat.id);
                    loadChats();
                },
            },
        ]);
    };

    const clearAll = () => {
        Alert.alert('Удалить все чаты?', 'Это действие нельзя отменить', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить все',
                style: 'destructive',
                onPress: async () => {
                    await StorageService.clearAllChats();
                    setChats([]);
                },
            },
        ]);
    };

    const newChat = async () => {
        const id = StorageService.generateId();
        await StorageService.setActiveChatId(id);
        router.navigate('/(tabs)');
    };

    const formatDate = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>История чатов</Text>
                <View style={styles.headerButtons}>
                    {chats.length > 0 && (
                        <TouchableOpacity onPress={clearAll} style={styles.headerBtn}>
                            <Text style={styles.headerBtnText}>🗑️</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={newChat} style={styles.headerBtn}>
                        <Text style={styles.headerBtnText}>✏️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {chats.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyTitle}>Нет сохранённых чатов</Text>
                        <Text style={styles.emptySubtext}>Начните новый разговор</Text>
                        <TouchableOpacity style={styles.newChatBtn} onPress={newChat}>
                            <Text style={styles.newChatBtnText}>Новый чат</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    chats.map((chat, index) => (
                        <Animated.View
                            key={chat.id}
                            entering={FadeInRight.duration(300).delay(index * 60)}
                        >
                            <TouchableOpacity
                                style={styles.chatItem}
                                onPress={() => openChat(chat)}
                                onLongPress={() => deleteChat(chat)}
                            >
                                <View style={styles.chatIcon}>
                                    <Text style={styles.chatIconText}>💬</Text>
                                </View>
                                <View style={styles.chatInfo}>
                                    <Text style={styles.chatTitle} numberOfLines={1}>
                                        {chat.title}
                                    </Text>
                                    <Text style={styles.chatPreview} numberOfLines={1}>
                                        {chat.messages[chat.messages.length - 1]?.content || ''}
                                    </Text>
                                </View>
                                <View style={styles.chatMeta}>
                                    <Text style={styles.chatDate}>{formatDate(chat.updatedAt)}</Text>
                                    <View style={styles.chatBadge}>
                                        <Text style={styles.chatBadgeText}>{chat.messages.length}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ececf1',
    },
    title: { fontSize: 20, fontWeight: '600', color: '#202123' },
    headerButtons: { flexDirection: 'row', gap: 8 },
    headerBtn: { padding: 8 },
    headerBtnText: { fontSize: 20 },
    list: { flex: 1 },
    listContent: { padding: 16, gap: 8 },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontSize: 22, fontWeight: '600', color: '#202123', marginBottom: 8 },
    emptySubtext: { fontSize: 15, color: '#6e6e80', marginBottom: 24 },
    newChatBtn: {
        backgroundColor: '#10a37f',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    newChatBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#f7f7f8',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ececf1',
        gap: 12,
    },
    chatIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e8f5e9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatIconText: { fontSize: 18 },
    chatInfo: { flex: 1 },
    chatTitle: { fontSize: 15, fontWeight: '600', color: '#202123', marginBottom: 4 },
    chatPreview: { fontSize: 13, color: '#6e6e80' },
    chatMeta: { alignItems: 'flex-end', gap: 4 },
    chatDate: { fontSize: 12, color: '#8e8ea0' },
    chatBadge: {
        backgroundColor: '#10a37f',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    chatBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
