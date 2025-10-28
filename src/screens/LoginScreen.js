import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { usePrefs } from '../context/PreferencesContext.js';
import { useAuth, MOCK_USERS } from '../context/AuthContext.js';
import { ExpoImage } from '../utils/device.js';
import { prettyRole } from '../utils/helpers.js';

export default function LoginScreen() {
    const { C, styles, t } = usePrefs();
    const { login, avatars } = useAuth();

    // In a real app, this would be a filtered list or API call
    const selectableUsers = Object.values(MOCK_USERS).filter(u => u.role === 'personal' || u.role === 'government');

    return (
        <Modal transparent={false} visible={true} animationType="fade">
            <SafeAreaView style={styles.container}>
                <View style={styles.loginContainer}>
                    <Text style={styles.loginTitle}>{t.loginTitle}</Text>
                    <Text style={styles.loginSub}>{t.loginPrompt}</Text>
                    <FlatList
                        data={selectableUsers}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.loginProfileCard} onPress={() => login(item)}>
                                <View style={[styles.profileAvatar, { width: 48, height: 48, marginRight: 12 }]}>
                                    {avatars[item.id] ? 
                                        <ExpoImage source={{ uri: avatars[item.id] }} style={styles.profileAvatarImg} /> :
                                        <Ionicons name="person-outline" size={24} color={C.primary}/>
                                    }
                                </View>
                                <View>
                                    <Text style={styles.commentAuthor}>{item.name}</Text>
                                    <Text style={{ color: C.subtext }}>{prettyRole(item.role)}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </SafeAreaView>
        </Modal>
    );
}