import React, { useMemo } from 'react';
import { FlatList, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useData } from '../context/DataContext.js';
import { usePrefs } from '../context/PreferencesContext.js';
import { useAuth } from '../context/AuthContext.js';
import { PostCard } from '../components/PostCard.js';

export default function MyPostsScreen({ navigation }) {
    const { C, styles, t } = usePrefs();
    const { posts } = useData();
    const { activeIdentity } = useAuth();

    const myPosts = useMemo(() => {
        return posts.filter(p => p.authorId === activeIdentity.id).sort((a, b) => b.timestamp - a.timestamp);
    }, [posts, activeIdentity]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <FlatList 
                data={myPosts} 
                keyExtractor={(i) => i.id} 
                renderItem={({ item }) => <PostCard item={item} />}
                ListHeaderComponent={
                    <View style={[styles.headerRow, { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top:8, bottom:8, left:8, right:8}}>
                            <Ionicons name="arrow-back" size={24} color={C.text} />
                        </TouchableOpacity>
                        <Text style={[styles.sectionTitle, { flex: 1, textAlign: 'center' }]}>{t.myPosts}</Text>
                        <View style={{ width: 24 }}/>
                    </View>
                }
                ListEmptyComponent={<Text style={{ textAlign: "center", color: C.subtext, marginTop: 40, paddingHorizontal: 24 }}>{t.myPostsEmpty}</Text>} 
                contentContainerStyle={{ paddingBottom: 90 }}
            />
        </SafeAreaView>
    );
}