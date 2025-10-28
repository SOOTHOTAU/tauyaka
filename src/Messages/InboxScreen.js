import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePrefs } from '../context/PreferencesContext.js';
import { useChat } from '../context/ChatContext.js';
import { useAuth } from '../context/AuthContext.js';
import { relTime } from '../utils/time.js';
import HeaderBell from '../components/HeaderBell.js';

export default function InboxScreen({ navigation }) {
    const { C, styles, t } = usePrefs();
    const { chats, messages } = useChat();
    const { user } = useAuth();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.headerRow, { paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border }]}>
                <HeaderBell />
                <Text style={[styles.sectionTitle, { flex: 1, textAlign: 'center' }]}>{t.navMessages}</Text>
                <View style={{ width: 46 }} />
            </View>
            <FlatList
                data={chats}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                    const otherUser = item.members.find(m => m !== user.id) || "User";
                    const lastMsg = (messages[item.id] || []).slice(-1)[0];
                    return (
                        <TouchableOpacity 
                            style={[styles.profileRow, { paddingHorizontal: 16 }]}
                            onPress={() => navigation.navigate('ChatThread', { chatId: item.id, name: otherUser })}
                        >
                            <View style={[styles.profileAvatar, { width: 48, height: 48, marginRight: 8 }]}>
                                <Ionicons name="person-outline" size={24} color={C.primary}/>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.commentAuthor}>{otherUser}</Text>
                                <Text style={{ color: C.subtext }} numberOfLines={1}>{lastMsg?.text || "No messages yet."}</Text>
                            </View>
                            <Text style={styles.commentTime}>{lastMsg ? relTime(lastMsg.time) : ''}</Text>
                        </TouchableOpacity>
                    )
                }}
                ListEmptyComponent={<Text style={{ textAlign: "center", color: C.subtext, marginTop: 40 }}>{t.noneHere}</Text>}
            />
        </SafeAreaView>
    );
}