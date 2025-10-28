import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext.js';
import { usePrefs } from '../context/PreferencesContext.js';
import { PostCard } from '../components/PostCard.js';

export default function SavedScreen() {
    const { C, styles, t } = usePrefs();
    const { posts, bookmarks, setBookmarks } = useData();
    const [translated, setTranslated] = useState({});

    const savedPosts = useMemo(() => {
        const ids = Object.keys(bookmarks).filter(k => !!bookmarks[k]);
        return posts.filter(p => ids.includes(p.id));
    }, [posts, bookmarks]);

    const renderCard = useCallback(({ item }) => (
        <PostCard 
          item={item} 
          translated={translated}
          onToggleTranslate={(id) => setTranslated(p => ({...p, [id]: !p[id]}))}
        />
      ), [translated]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <FlatList 
                data={savedPosts} 
                keyExtractor={(i) => i.id} 
                renderItem={renderCard} 
                ListHeaderComponent={
                    <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
                        <View style={[styles.headerRow]}>
                            <Text style={[styles.sectionTitle]}>{t.savedTitle(savedPosts.length)}</Text>
                            {savedPosts.length > 0 && (
                                <TouchableOpacity onPress={() => setBookmarks({})} accessibilityLabel={t.unsaveAll}>
                                    <Text style={{ color: "#C62828", fontWeight: "900" }}>{t.unsaveAll}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                }
                ListEmptyComponent={<Text style={{ textAlign: "center", color: C.subtext, marginTop: 40 }}>{t.savedEmpty}</Text>} 
                contentContainerStyle={{ paddingBottom: 90 }}
            />
        </SafeAreaView>
    );
}