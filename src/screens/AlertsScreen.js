import React, { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext.js';
import { usePrefs } from '../context/PreferencesContext.js';
import { PostCard } from '../components/PostCard.js';

export default function AlertsScreen() {
    const { C, styles, t } = usePrefs();
    const { posts } = useData();
    const [translated, setTranslated] = useState({}); // State for this screen

    const alertPosts = posts.filter(p => p.category === 'alert').sort((a,b) => b.timestamp - a.timestamp);

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
                data={alertPosts} 
                keyExtractor={(i) => i.id} 
                renderItem={renderCard}
                ListHeaderComponent={<View style={[styles.headerRow, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border }]}><Text style={[styles.sectionTitle, { flex: 1 }]}>{t.alertsSection}</Text></View>}
                ListEmptyComponent={<Text style={{ textAlign: "center", color: C.subtext, marginTop: 40 }}>{t.noneHere}</Text>} 
                contentContainerStyle={{ paddingBottom: 90 }}
            />
        </SafeAreaView>
    );
}