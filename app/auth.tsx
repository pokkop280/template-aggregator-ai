import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StorageService } from '@/services/storage';
import { useAppTheme } from './_layout';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
    const router = useRouter();
    const { colors, isDark } = useAppTheme();
    const [appleAvail, setAppleAvail] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'ios') {
            AppleAuthentication.isAvailableAsync().then(setAppleAvail).catch(() => { });
        }
    }, []);

    const handleApple = async () => {
        setLoading(true);
        try {
            const cred = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });
            const uid = cred.user;
            StorageService.setUserId(uid);
            await StorageService.saveAuth({
                isAuthenticated: true,
                userName: cred.fullName?.givenName || 'User',
                email: cred.email || undefined,
                appleUserId: uid,
            });
            router.replace('/(tabs)');
        } catch (e: any) {
            if (e.code !== 'ERR_REQUEST_CANCELED') console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = async () => {
        setLoading(true);
        const gid = 'guest_' + Date.now().toString(36);
        StorageService.setUserId(gid);
        await StorageService.saveAuth({ isAuthenticated: true, userName: 'Guest', appleUserId: gid });
        router.replace('/(tabs)');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Card */}
            <View style={[styles.card, { borderColor: colors.border }]}>
                <BlurView intensity={25} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
                <View style={[styles.inner, { backgroundColor: colors.cardBg }]}>
                    {/* Logo */}
                    <View style={styles.logoBg}>
                        <Ionicons name="sparkles" size={36} color="#fff" />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>Добро пожаловать</Text>
                    <Text style={[styles.sub, { color: colors.textSec }]}>Войдите, чтобы начать общение с AI</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 32 }} />
                    ) : (
                        <View style={styles.btns}>
                            {appleAvail ? (
                                <AppleAuthentication.AppleAuthenticationButton
                                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                    buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                    cornerRadius={14}
                                    style={styles.appleBtn}
                                    onPress={handleApple}
                                />
                            ) : (
                                <TouchableOpacity style={styles.appleCustom} onPress={handleApple} activeOpacity={0.8}>
                                    <Ionicons name="logo-apple" size={22} color="#000" />
                                    <Text style={styles.appleTxt}>Войти с Apple ID</Text>
                                </TouchableOpacity>
                            )}
                            <View style={styles.divider}>
                                <View style={[styles.divLine, { backgroundColor: colors.border }]} />
                                <Text style={[styles.divText, { color: colors.textTer }]}>или</Text>
                                <View style={[styles.divLine, { backgroundColor: colors.border }]} />
                            </View>
                            <TouchableOpacity style={[styles.guestBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={handleGuest} activeOpacity={0.8}>
                                <Ionicons name="person-outline" size={20} color={colors.text} />
                                <Text style={[styles.guestTxt, { color: colors.text }]}>Продолжить без входа</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            <Text style={[styles.footer, { color: colors.textTer }]}>Powered by OpenRouter</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 400, borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
    inner: { padding: 32, alignItems: 'center' },
    logoBg: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#10a37f', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
    sub: { fontSize: 15, textAlign: 'center', marginBottom: 8 },
    btns: { width: '100%', marginTop: 24, gap: 16 },
    appleBtn: { width: '100%', height: 52 },
    appleCustom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', height: 52, borderRadius: 14, gap: 8 },
    appleTxt: { fontSize: 17, fontWeight: '600', color: '#000' },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    divLine: { flex: 1, height: 1 },
    divText: { fontSize: 13 },
    guestBtn: { flexDirection: 'row', height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    guestTxt: { fontSize: 16, fontWeight: '500' },
    footer: { position: 'absolute', bottom: 40, fontSize: 12 },
});
