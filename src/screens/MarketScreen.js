import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePrefs } from '../context/PreferencesContext.js';

export default function MarketScreen() {
    const { C, styles, t } = usePrefs();
    return (
        <SafeAreaView style={[styles.container, {flex:1, alignItems:"center", justifyContent:"center"}]} edges={['top']}>
            <Text style={{ color:C.subtext }}>{t.comingSoon}</Text>
        </SafeAreaView>
    );
}