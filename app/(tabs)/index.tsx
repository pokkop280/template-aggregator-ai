import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Dimensions,
  Pressable,
  Share,
  Keyboard,
  Vibration,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { OpenRouterClient } from '@/services/openrouter';
import {
  StorageService,
  type ChatData,
  type AppSettings,
  type AdminNotification,
  type PersonalInfo,
  DEFAULT_SETTINGS,
} from '@/services/storage';
import { useAppTheme } from '../_layout';

const API_KEY = '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';
const SIDEBAR_W = Dimensions.get('window').width * 0.82;
const FONT_SIZES = { small: 13, medium: 15, large: 17 };

interface Message { role: 'user' | 'assistant'; content: string; image?: string; ts?: number; fileName?: string; fileUri?: string; }

// ── Grouping ──
const groupChats = (chats: ChatData[]) => {
  const ts = new Date().setHours(0, 0, 0, 0);
  const d = 86400000;
  const g: { title: string; chats: ChatData[] }[] = [];
  const a: ChatData[] = [], b: ChatData[] = [], c: ChatData[] = [], e: ChatData[] = [];
  for (const x of chats) {
    if (x.updatedAt >= ts) a.push(x);
    else if (x.updatedAt >= ts - d) b.push(x);
    else if (x.updatedAt >= ts - 7 * d) c.push(x);
    else e.push(x);
  }
  if (a.length) g.push({ title: 'Сегодня', chats: a });
  if (b.length) g.push({ title: 'Вчера', chats: b });
  if (c.length) g.push({ title: 'Последние 7 дней', chats: c });
  if (e.length) g.push({ title: 'Ранее', chats: e });
  return g;
};

// ── Code parser ──
interface ContentPart { type: 'text' | 'code'; content: string; lang?: string; }
const parseContent = (text: string): ContentPart[] => {
  const parts: ContentPart[] = [];
  const re = /```\s*(\w*)\s*\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) });
    parts.push({ type: 'code', content: m[2].trimEnd(), lang: m[1] || '' });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts;
};

// ── Syntax ──
interface Token { text: string; color: string; }
const tokenize = (code: string): Token[] => {
  const tokens: Token[] = [];
  const pat = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:const|let|var|function|return|if|else|for|while|class|import|export|from|default|new|this|async|await|try|catch|throw|true|false|null|undefined|void|interface|type|enum|extends|implements|static|public|private|protected|readonly|abstract|super|constructor|switch|case|break|continue|do|in|of|with|delete|yield|as|is|def|self|print|elif|lambda|pass|raise|except|finally|None|True|False|struct|fn|pub|mut|impl|use|mod|crate|match|loop|ref|dyn|where|trait|unsafe)\b|\b\d+\.?\d*\b)/g;
  let last = 0, mt;
  while ((mt = pat.exec(code)) !== null) {
    if (mt.index > last) tokens.push({ text: code.slice(last, mt.index), color: '#d4d4d4' });
    const v = mt[0];
    let cl = '#d4d4d4';
    if (v.startsWith('//') || v.startsWith('/*') || v.startsWith('#')) cl = '#6a9955';
    else if (v.startsWith('"') || v.startsWith("'") || v.startsWith('`')) cl = '#ce9178';
    else if (/^\d/.test(v)) cl = '#b5cea8';
    else cl = '#c586c0';
    tokens.push({ text: v, color: cl });
    last = mt.index + v.length;
  }
  if (last < code.length) tokens.push({ text: code.slice(last), color: '#d4d4d4' });
  return tokens;
};

// ── Inline code ──
const renderTextParts = (text: string, textColor: string, surfaceColor: string, fontSize: number) => {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <Text style={{ fontSize, lineHeight: fontSize * 1.6, color: textColor }}>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`')
          ? <Text key={i} style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: surfaceColor, fontSize: fontSize - 1 }}>{p.slice(1, -1)}</Text>
          : <Text key={i}>{p}</Text>
      )}
    </Text>
  );
};

// ── Search Animation ──
const SEARCH_FRAMES = [
  { icon: 'search', emoji: '', text: 'Начинаю поиск' },
  { icon: 'search', emoji: '', text: 'Подключаюсь к интернету' },
  { icon: 'globe-outline', emoji: '', text: 'Ищу информацию' },
  { icon: 'globe-outline', emoji: '', text: 'Сканирую источники' },
  { icon: 'search', emoji: '', text: 'Получаю данные' },
  { icon: 'analytics-outline', emoji: '', text: 'Анализирую результаты' },
  { icon: 'document-text-outline', emoji: '', text: 'Обрабатываю контент' },
  { icon: 'checkmark-circle', emoji: '', text: 'Почти готово' },
];

const SearchingAnimation = ({ colors, frame }: { colors: any; frame: number }) => {
  const currentFrame = SEARCH_FRAMES[frame % SEARCH_FRAMES.length];
  return (
    <View style={styles.searchAnim}>
      <View style={[styles.searchAnimInner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={{ fontSize: 20, marginLeft: 8 }}>{currentFrame.emoji}</Text>
        <Text style={[styles.searchAnimText, { color: colors.textSec }]}>{currentFrame.text}</Text>
        <View style={styles.searchDots}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[styles.searchDot, { backgroundColor: colors.accent, opacity: 0.4 + i * 0.2 }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

export default function Index() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [chatId, setChatId] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; uri: string; content?: string } | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchFrame, setSearchFrame] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [likedIdx, setLikedIdx] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<AdminNotification | null>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({});
  const scrollRef = useRef<ScrollView>(null);
  const cidRef = useRef('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sidebar
  const [sideOpen, setSideOpen] = useState(false);
  const [chats, setChats] = useState<ChatData[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const sideX = useSharedValue(-SIDEBAR_W);
  const overlayOp = useSharedValue(0);

  const fs = FONT_SIZES[settings.fontSize] || 15;

  const haptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'select' = 'light') => {
    if (!settings.hapticFeedback) return;
    // Try expo-haptics first, fall back to Vibration API
    try {
      if (type === 'select') { Haptics.selectionAsync(); return; }
      if (type === 'success') { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); return; }
      if (type === 'warning') { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
      if (type === 'heavy') { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); return; }
      if (type === 'medium') { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); return; }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback: native Vibration (works in Expo Go on real devices)
      const dur = type === 'heavy' ? 50 : type === 'medium' ? 30 : type === 'success' ? 40 : type === 'warning' ? 60 : 10;
      Vibration.vibrate(dur);
    }
  };

  // ── Effects ──
  useEffect(() => { initChat(); }, []);
  useFocusEffect(useCallback(() => { reloadSettings(); checkSwitch(); loadNotification(); }, []));
  useEffect(() => {
    if (scrollRef.current && messages.length > 0)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);
  useEffect(() => {
    if (searching) {
      const interval = setInterval(() => {
        setSearchFrame(prev => (prev + 1) % SEARCH_FRAMES.length);
      }, 600);
      return () => clearInterval(interval);
    } else {
      setSearchFrame(0);
    }
  }, [searching]);
  useEffect(() => {
    if (cidRef.current && messages.length > 0) {
      const firstContent = messages.find(m => m.role === 'user')?.content || 'Новый чат';
      StorageService.saveChat({
        id: cidRef.current,
        title: StorageService.generateTitle(firstContent),
        messages: messages.map(m => ({ role: m.role, content: m.content, image: m.image, fileName: m.fileName, fileUri: m.fileUri })),
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
  }, [messages]);

  const initChat = async () => {
    const auth = await StorageService.getAuth();
    if (!auth?.isAuthenticated) { router.replace('/auth'); return; }
    if (auth.appleUserId) StorageService.setUserId(auth.appleUserId);
    const s = await StorageService.getSettings(); setSettings(s);
    setPersonalInfo(await StorageService.getPersonalInfo());
    const aid = await StorageService.getActiveChatId();
    if (aid) { const all = await StorageService.getChats(); const c = all.find(x => x.id === aid); if (c) { cidRef.current = c.id; setChatId(c.id); setMessages(c.messages); return; } }
    newChat();
  };
  const reloadSettings = async () => {
    setSettings(await StorageService.getSettings());
    setPersonalInfo(await StorageService.getPersonalInfo());
  };
  const checkSwitch = async () => {
    const aid = await StorageService.getActiveChatId();
    if (aid && aid !== cidRef.current) { const all = await StorageService.getChats(); const c = all.find(x => x.id === aid); if (c) { cidRef.current = c.id; setChatId(c.id); setMessages(c.messages); } else newChat(); }
  };
  const loadNotification = async () => {
    const notifs = await StorageService.getNotifications();
    const unread = notifs.find(n => !n.read);
    if (unread) setNotification(unread);
  };
  const dismissNotification = async () => {
    if (notification) { await StorageService.markNotificationRead(notification.id); setNotification(null); }
  };
  const newChat = () => {
    haptic();
    const id = StorageService.generateId(); cidRef.current = id; setChatId(id); setMessages([]); StorageService.setActiveChatId(id);
  };

  // ── Sidebar ──
  const openSide = async () => {
    Keyboard.dismiss();
    haptic();
    setChats(await StorageService.getChats());
    sideX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    overlayOp.value = withTiming(1, { duration: 280 });
    setSideOpen(true);
  };
  const closeSide = () => {
    sideX.value = withTiming(-SIDEBAR_W, { duration: 250, easing: Easing.in(Easing.cubic) });
    overlayOp.value = withTiming(0, { duration: 250 });
    setSideOpen(false);
    setSearchQ('');
  };
  const selectChat = async (c: ChatData) => {
    haptic();
    cidRef.current = c.id; setChatId(c.id); setMessages(c.messages); await StorageService.setActiveChatId(c.id); closeSide();
  };
  const delChat = async (c: ChatData) => {
    haptic('heavy');
    Alert.alert('Удалить?', c.title, [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Да', style: 'destructive', onPress: async () => {
          await StorageService.deleteChat(c.id);
          const remaining = await StorageService.getChats();
          setChats(remaining);
          if (c.id === cidRef.current) newChat();
        }
      },
    ]);
  };

  // ── Attachments ──
  const pickImg = async () => {
    setShowAttachMenu(false);
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.3, base64: true });
    if (!r.canceled && r.assets[0]) { setAttachedImage(r.assets[0].uri); if (r.assets[0].base64) setImageBase64(`data:image/jpeg;base64,${r.assets[0].base64}`); setAttachedFile(null); }
  };
  const takePhoto = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нужен доступ к камере'); return; }
    const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.3, base64: true });
    if (!r.canceled && r.assets[0]) { setAttachedImage(r.assets[0].uri); if (r.assets[0].base64) setImageBase64(`data:image/jpeg;base64,${r.assets[0].base64}`); setAttachedFile(null); }
  };
  const pickFile = async () => {
    setShowAttachMenu(false);
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!r.canceled && r.assets && r.assets[0]) {
        const file = r.assets[0];
        let content: string | undefined;
        // Read text-based files
        const textExts = ['.txt', '.md', '.json', '.js', '.ts', '.py', '.html', '.css', '.csv', '.xml', '.yaml', '.yml', '.sh', '.bat', '.log', '.env', '.cfg', '.ini', '.toml'];
        const isText = textExts.some(ext => file.name.toLowerCase().endsWith(ext));
        if (isText && file.uri) {
          try { content = await FileSystem.readAsStringAsync(file.uri); } catch { }
        }
        setAttachedFile({ name: file.name, uri: file.uri, content });
        setAttachedImage(null); setImageBase64(null);
        haptic();
      }
    } catch { }
  };
  const clearAttach = () => { setAttachedImage(null); setImageBase64(null); setAttachedFile(null); };



  // ── Actions ──
  const doCopy = (text: string, id: string) => { haptic('success'); setCopiedCode(id); setTimeout(() => setCopiedCode(null), 2000); try { const { Clipboard } = require('react-native'); Clipboard?.setString?.(text); } catch { } };
  const doMsgCopy = (text: string, idx: number) => { haptic('success'); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); try { const { Clipboard } = require('react-native'); Clipboard?.setString?.(text); } catch { } };
  const doShare = async (text: string) => { haptic('select'); try { await Share.share({ message: text }); } catch { } };
  const toggleLike = (idx: number) => { haptic('select'); setLikedIdx(p => { const n = new Set(p); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; }); };

  // ── Stop Generation ──
  const stopGeneration = () => {
    haptic('heavy');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setSearching(false);
    // Удаляем последние 2 сообщения (user + assistant)
    setMessages(p => p.slice(0, -2));
  };

  // ── Format Personal Info ──
  const formatPersonalInfo = (): string => {
    const filled = Object.entries(personalInfo).filter(([_, answer]) => answer.trim());
    if (filled.length === 0) return '';

    const infoLines = filled.map(([question, answer]) => `- ${question} ${answer}`);
    return `\n\n[Информация о пользователе]\n${infoLines.join('\n')}`;
  };

  // ── Send with STREAMING ──
  const sendMessage = async () => {
    if (!message.trim() && !attachedImage && !attachedFile) return;
    haptic('medium');

    let content = message.trim();
    if (attachedFile?.content) {
      content = `${content}\n\n--- Файл: ${attachedFile.name} ---\n${attachedFile.content}`;
    } else if (attachedFile) {
      content = `${content}\n\n[Прикреплён файл: ${attachedFile.name}]`;
    }

    const um: Message = { role: 'user', content, image: attachedImage || undefined, ts: Date.now(), fileName: attachedFile?.name, fileUri: attachedFile?.uri };
    const prevMsgs = [...messages];
    const cm = content;
    const cb = imageBase64;
    setMessage(''); clearAttach(); setShowAttachMenu(false);
    setLoading(true);

    // Создаем AbortController для возможности остановки
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Добавляем только user message
    setMessages(p => [...p, um]);

    try {
      const client = new OpenRouterClient(API_KEY);

      // Формируем системный промпт с информацией о пользователе
      const personalContext = formatPersonalInfo();
      let sysPrompt = settings.systemPrompt || '';

      // Добавляем информацию о пользователе
      if (personalContext) {
        sysPrompt += personalContext;
      }



      if (webSearch) {
        setSearching(true);
      }

      // После поиска добавляем пустое assistant message
      setMessages(p => [...p, { role: 'assistant', content: '', ts: Date.now() }]);

      const apiMsgs = [
        ...prevMsgs.map(m => ({ role: m.role, content: m.content, image: undefined as string | undefined })),
        { role: 'user' as const, content: cm || 'Опиши это изображение', image: cb || undefined },
      ];

      const FINAL_SYS_PROMPT = sysPrompt.trim() || undefined;

      const finalText = await client.streamConversation(
        settings.model, apiMsgs,
        {
          temperature: settings.temperature,
          systemPrompt: FINAL_SYS_PROMPT,
          enableSearch: webSearch
        },
        (text) => {
          // Если начали приходить токены, значит поиск закончился
          setSearching(false);

          // Проверяем что запрос не был отменен
          if (abortControllerRef.current) {
            setMessages(p => { const u = [...p]; if (u.length > 0) u[u.length - 1] = { ...u[u.length - 1], content: text }; return u; });
          }
        }
      );

      // Проверяем что запрос не был отменен перед финальным обновлением
      if (abortControllerRef.current) {
        setMessages(p => { const u = [...p]; if (u.length > 0) u[u.length - 1] = { ...u[u.length - 1], content: finalText }; return u; });
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // Ничего не делаем - сообщения уже удалены в stopGeneration
      } else if (abortControllerRef.current) {
        // Показываем ошибку только если запрос не был отменен
        setMessages(p => { const u = [...p]; if (u.length > 0) u[u.length - 1] = { ...u[u.length - 1], content: 'Ошибка: ' + (e.message || 'Нет ответа') }; return u; });
      }
    } finally {
      setLoading(false);
      setSearching(false);
      abortControllerRef.current = null;
    }
  };

  // ── Animated ──
  const sideAnim = useAnimatedStyle(() => ({ transform: [{ translateX: sideX.value }] }));
  const overlayAnim = useAnimatedStyle(() => ({ opacity: overlayOp.value }));

  // ── Code Block ──
  const CodeBlock = ({ code, lang, blockId }: { code: string; lang: string; blockId: string }) => {
    const tokens = tokenize(code);
    const isCopied = copiedCode === blockId;
    return (
      <View style={styles.codeBlock}>
        <View style={styles.codeHeader}>
          <Text style={styles.codeLang}>{lang || 'code'}</Text>
          <TouchableOpacity style={styles.codeCopyBtn} onPress={() => doCopy(code, blockId)} activeOpacity={0.6}>
            <Ionicons name={isCopied ? 'checkmark-done' : 'copy-outline'} size={14} color={isCopied ? '#10a37f' : '#8e8e93'} />
            <Text style={[styles.codeCopyTxt, isCopied && { color: '#10a37f' }]}>{isCopied ? 'Copied!' : 'Copy code'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeScroll}>
          <Text style={styles.codeText} selectable>
            {tokens.map((t, i) => <Text key={i} style={{ color: t.color }}>{t.text}</Text>)}
          </Text>
        </ScrollView>
      </View>
    );
  };

  // ── Filtered chats ──
  const filteredChats = searchQ.trim()
    ? chats.filter(c => c.title.toLowerCase().includes(searchQ.toLowerCase()) || c.messages.some(m => m.content.toLowerCase().includes(searchQ.toLowerCase())))
    : chats;

  // ── Render message ──
  const renderMsg = (msg: Message, index: number) => {
    const isAI = msg.role === 'assistant';
    const isStreaming = loading && index === messages.length - 1 && isAI;
    const parts = parseContent(msg.content);
    const timeStr = msg.ts ? new Date(msg.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

    const content = (
      <View style={[styles.msgRow, isAI && { backgroundColor: colors.surface }]}>
        <View style={[styles.av, { backgroundColor: isAI ? colors.aiAv : colors.userAv }]}>
          <Ionicons name={isAI ? 'sparkles' : 'person'} size={14} color="#fff" />
        </View>
        <View style={styles.msgBody}>
          <View style={styles.msgMeta}>
            <Text style={[styles.msgName, { color: colors.textSec }]}>{isAI ? 'RoboAI' : 'Вы'}</Text>
            {settings.showTimestamps && timeStr ? <Text style={[styles.msgTime, { color: colors.textTer }]}>{timeStr}</Text> : null}
          </View>
          {msg.image && <Image source={{ uri: msg.image }} style={[styles.msgImg, { backgroundColor: colors.bgAlt }]} resizeMode="cover" />}
          {msg.fileName && !msg.image && (
            <View style={[styles.fileChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="document-outline" size={16} color={colors.accent} />
              <Text style={[styles.fileChipTxt, { color: colors.text }]} numberOfLines={1}>{msg.fileName}</Text>
            </View>
          )}
          {parts.map((p, pi) =>
            p.type === 'code'
              ? <CodeBlock key={pi} code={p.content} lang={p.lang || ''} blockId={`${index}-${pi}`} />
              : p.content.trim() ? <View key={pi}>{renderTextParts(p.content, colors.text, colors.surface, fs)}</View> : null
          )}
          {isStreaming && <View style={styles.loadRow}><ActivityIndicator size="small" color={colors.accent} /></View>}
          {isAI && msg.content.length > 0 && !isStreaming && (
            <View style={styles.msgActions}>
              <TouchableOpacity style={styles.actBtn} onPress={() => doMsgCopy(msg.content, index)} activeOpacity={0.6}>
                <Ionicons name={copiedIdx === index ? 'checkmark-done' : 'copy-outline'} size={16} color={copiedIdx === index ? colors.accent : colors.textTer} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actBtn} onPress={() => toggleLike(index)} activeOpacity={0.6}>
                <Ionicons name={likedIdx.has(index) ? 'heart' : 'heart-outline'} size={16} color={likedIdx.has(index) ? '#ef4444' : colors.textTer} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actBtn} onPress={() => doShare(msg.content)} activeOpacity={0.6}>
                <Ionicons name="share-outline" size={16} color={colors.textTer} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );

    if (settings.animationsEnabled && !isStreaming) {
      return <Animated.View key={`${chatId}-${index}`} entering={FadeInDown.duration(300)}>{content}</Animated.View>;
    }
    return <View key={`${chatId}-${index}`}>{content}</View>;
  };

  // ════════════════════════════
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      {/* Notification banner */}
      {notification && (
        <View style={[styles.notifBar, { backgroundColor: colors.accent }]}>
          <View style={styles.notifContent}>
            <Ionicons name="megaphone-outline" size={16} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{notification.title}</Text>
              <Text style={styles.notifBody} numberOfLines={2}>{notification.body}</Text>
            </View>
            <TouchableOpacity onPress={dismissNotification}><Ionicons name="close" size={18} color="#fff" /></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BlurView intensity={40} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
        <View style={styles.headerIn}>
          <TouchableOpacity onPress={openSide} style={[styles.hBtn, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
            <Ionicons name="menu-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.hTitle, { color: colors.text }]}>RoboAI</Text>
          <TouchableOpacity onPress={newChat} style={[styles.hBtn, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={styles.chatC} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.emptyW}>
            <View style={[styles.emptyLogo, { backgroundColor: colors.accent }]}><Ionicons name="sparkles" size={36} color="#fff" /></View>
            <Text style={[styles.emptyT, { color: colors.text }]}>Как я могу помочь?</Text>
            <View style={styles.sugGrid}>
              {[
                { t: 'Напиши историю', s: 'про робота', m: 'Напиши краткую историю про робота' },
                { t: 'Объясни физику', s: 'простыми словами', m: 'Объясни квантовую физику простыми словами' },
                { t: 'Напиши код', s: 'сортировки массива', m: 'Напиши код сортировки массива на Python' },
                { t: 'Расскажи анекдот', s: 'поднять настроение', m: 'Расскажи анекдот' },
              ].map((item, i) => (
                <Animated.View key={i} entering={settings.animationsEnabled ? FadeIn.delay(i * 100).duration(400) : undefined}>
                  <TouchableOpacity style={[styles.sugCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => { setMessage(item.m); haptic(); }} activeOpacity={0.7}>
                    <Text style={[styles.sugT, { color: colors.text, fontSize: fs }]}>{item.t}</Text>
                    <Text style={[styles.sugS, { color: colors.textTer }]}>{item.s}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>
        ) : messages.map((m, i) => {
          // Если это последнее сообщение (от AI) и сейчас идет поиск — скрываем его
          if (searching && i === messages.length - 1 && m.role === 'assistant') return null;
          return renderMsg(m, i);
        })}
        {searching && (
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeIn.duration(200)}>
            <SearchingAnimation colors={colors} frame={searchFrame} />
          </Animated.View>
        )}
      </ScrollView>

      {/* Attached image preview */}
      {attachedImage && (
        <View style={[styles.imgPrev, { backgroundColor: colors.bgAlt, borderTopColor: colors.border }]}>
          <Image source={{ uri: attachedImage }} style={[styles.imgThumb, { backgroundColor: colors.surface }]} resizeMode="cover" />
          <TouchableOpacity style={styles.imgRem} onPress={clearAttach}><Ionicons name="close" size={14} color="#fff" /></TouchableOpacity>
        </View>
      )}
      {/* Attached file preview */}
      {attachedFile && !attachedImage && (
        <View style={[styles.imgPrev, { backgroundColor: colors.bgAlt, borderTopColor: colors.border }]}>
          <View style={[styles.filePreview, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-outline" size={22} color={colors.accent} />
          </View>
          <Text style={[styles.filePrevName, { color: colors.text }]} numberOfLines={1}>{attachedFile.name}</Text>
          <TouchableOpacity style={styles.imgRem} onPress={clearAttach}><Ionicons name="close" size={14} color="#fff" /></TouchableOpacity>
        </View>
      )}
      {/* Attach menu */}
      {showAttachMenu && (
        <View style={[styles.attachMenu, { backgroundColor: colors.bgAlt, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.attachBtn, { backgroundColor: colors.surface }]} onPress={takePhoto}><Ionicons name="camera-outline" size={18} color={colors.text} /><Text style={[styles.attachTxt, { color: colors.text }]}>Камера</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.attachBtn, { backgroundColor: colors.surface }]} onPress={pickImg}><Ionicons name="image-outline" size={18} color={colors.text} /><Text style={[styles.attachTxt, { color: colors.text }]}>Галерея</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.attachBtn, { backgroundColor: colors.surface }]} onPress={pickFile}><Ionicons name="document-outline" size={18} color={colors.text} /><Text style={[styles.attachTxt, { color: colors.text }]}>Файлы</Text></TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputW, { borderTopColor: colors.border }]}>
        <View style={[styles.inputR, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.attBtn} onPress={() => { setShowAttachMenu(!showAttachMenu); haptic(); }}><Ionicons name="add-circle-outline" size={24} color={colors.textSec} /></TouchableOpacity>
          <TouchableOpacity style={styles.attBtn} onPress={() => { setWebSearch(!webSearch); haptic(); }}>
            <Ionicons name="globe-outline" size={22} color={webSearch ? colors.accent : colors.textSec} />
          </TouchableOpacity>
          <TextInput
            style={[styles.inp, { color: colors.text, fontSize: fs }]}
            placeholder={webSearch ? 'Поиск в интернете...' : 'Сообщение...'}
            placeholderTextColor={colors.textTer}
            value={message} onChangeText={setMessage}
            multiline maxLength={4000} editable={!loading}
            onSubmitEditing={settings.sendOnEnter ? sendMessage : undefined}
            blurOnSubmit={settings.sendOnEnter}
            textAlignVertical="center"
          />
          {loading ? (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.danger }]}
              onPress={stopGeneration}
              activeOpacity={0.7}
            >
              <Ionicons name="stop" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: (!message.trim() && !attachedImage && !attachedFile) ? colors.surface : colors.accent }]}
              onPress={sendMessage}
              disabled={!message.trim() && !attachedImage && !attachedFile}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-up" size={18} color={(!message.trim() && !attachedImage && !attachedFile) ? colors.textTer : '#fff'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayAnim]} pointerEvents={sideOpen ? 'auto' : 'none'}><Pressable style={StyleSheet.absoluteFill} onPress={closeSide} /></Animated.View>

      {/* Sidebar */}
      <Animated.View style={[styles.side, sideAnim, { borderRightColor: colors.border }]}>
        <BlurView intensity={60} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
        <View style={[styles.sideIn, { backgroundColor: colors.sidebarBg }]}>
          <TouchableOpacity style={[styles.sideNew, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => { newChat(); closeSide(); }} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color={colors.text} /><Text style={[styles.sideNewTxt, { color: colors.text }]}>Новый чат</Text>
          </TouchableOpacity>

          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color={colors.textTer} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Поиск по чатам..."
              placeholderTextColor={colors.textTer}
              value={searchQ} onChangeText={setSearchQ}
            />
            {searchQ.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQ('')}><Ionicons name="close-circle" size={16} color={colors.textTer} /></TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.sideList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filteredChats.length === 0 ? (
              <View style={styles.sideEmpty}><Text style={[styles.sideEmptyTxt, { color: colors.textTer }]}>{searchQ ? 'Ничего не найдено' : 'Нет чатов'}</Text></View>
            ) : groupChats(filteredChats).map(g => (
              <View key={g.title} style={styles.sideGrp}>
                <Text style={[styles.sideGrpT, { color: colors.textTer }]}>{g.title}</Text>
                {g.chats.map(c => (
                  <View key={c.id} style={[styles.sideItem, c.id === cidRef.current && { backgroundColor: colors.surface }]}>
                    <TouchableOpacity style={styles.sideItemMain} onPress={() => selectChat(c)} activeOpacity={0.7}>
                      <Ionicons name="chatbubble-outline" size={14} color={c.id === cidRef.current ? colors.text : colors.textSec} />
                      <Text style={[styles.sideItemTxt, { color: c.id === cidRef.current ? colors.text : colors.textSec }]} numberOfLines={1}>{c.title}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.sideItemDel} onPress={() => delChat(c)}>
                      <Ionicons name="trash-outline" size={14} color={colors.textTer} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={[styles.sideBot, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.sideSettings, { backgroundColor: colors.surface }]} onPress={() => { closeSide(); setTimeout(() => router.push('/modal'), 300); }} activeOpacity={0.7}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
              <Text style={[styles.sideSettingsTxt, { color: colors.text }]}>Настройки</Text>
              <View style={{ flex: 1 }} /><Ionicons name="chevron-forward" size={16} color={colors.textTer} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notifBar: { paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 10, paddingHorizontal: 16 },
  notifContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  notifBody: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  header: { overflow: 'hidden', borderBottomWidth: 1 },
  headerIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16 },
  hBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  chat: { flex: 1 },
  chatC: { paddingVertical: 16 },
  emptyW: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 60 },
  emptyLogo: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyT: { fontSize: 26, fontWeight: '700', marginBottom: 32 },
  sugGrid: { width: '100%', gap: 10 },
  sugCard: { padding: 16, borderRadius: 14, borderWidth: 1 },
  sugT: { fontWeight: '500', marginBottom: 3 },
  sugS: { fontSize: 13 },
  msgRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  av: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  msgBody: { flex: 1 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  msgName: { fontSize: 13, fontWeight: '600' },
  msgTime: { fontSize: 11 },
  msgImg: { width: '100%', height: 200, borderRadius: 12, marginBottom: 8 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginBottom: 8, alignSelf: 'flex-start' },
  fileChipTxt: { fontSize: 13, maxWidth: 200 },
  msgActions: { flexDirection: 'row', gap: 2, marginTop: 10 },
  actBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  codeBlock: { marginVertical: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1e1e1e' },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#2d2d2d' },
  codeLang: { fontSize: 12, color: '#8e8e93', fontWeight: '600', textTransform: 'lowercase' },
  codeCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  codeCopyTxt: { fontSize: 12, color: '#8e8e93', fontWeight: '500' },
  codeScroll: { paddingHorizontal: 14, paddingVertical: 12 },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, lineHeight: 20 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  imgPrev: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, gap: 10 },
  imgThumb: { width: 56, height: 56, borderRadius: 10 },
  imgRem: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  filePreview: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filePrevName: { flex: 1, fontSize: 14 },
  attachMenu: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  attachTxt: { fontSize: 14, fontWeight: '500' },
  inputW: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, borderTopWidth: 1 },
  inputR: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 10, paddingVertical: 6, gap: 6, borderWidth: 1, minHeight: 44 },
  attBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  inp: { flex: 1, maxHeight: 120, paddingVertical: 0 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  side: { position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_W, zIndex: 20, overflow: 'hidden', borderRightWidth: 1 },
  sideIn: { flex: 1, paddingTop: Platform.OS === 'ios' ? 56 : 40 },
  sideNew: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginBottom: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  sideNewTxt: { fontSize: 15, fontWeight: '600' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  sideList: { flex: 1, paddingHorizontal: 10 },
  sideEmpty: { alignItems: 'center', paddingTop: 40 },
  sideEmptyTxt: { fontSize: 14 },
  sideGrp: { marginBottom: 16 },
  sideGrpT: { fontSize: 11, fontWeight: '700', marginBottom: 6, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  sideItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, marginBottom: 2 },
  sideItemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 12 },
  sideItemTxt: { fontSize: 14, flex: 1 },
  sideItemDel: { paddingHorizontal: 10, paddingVertical: 10 },
  sideBot: { borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  sideSettings: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
  sideSettingsTxt: { fontSize: 15, fontWeight: '500' },
  searchAnim: { paddingHorizontal: 16, paddingVertical: 12 },
  searchAnimInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  searchAnimText: { flex: 1, fontSize: 14, fontWeight: '500' },
  searchDots: { flexDirection: 'row', gap: 4 },
  searchDot: { width: 6, height: 6, borderRadius: 3 },
});