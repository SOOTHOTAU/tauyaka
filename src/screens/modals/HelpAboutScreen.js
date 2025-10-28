import React from 'react';
import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePrefs } from '../../context/PreferencesContext.js';

export default function HelpAboutScreen({ navigation }) {
    const { C, styles, t } = usePrefs();

    const Section = ({ title, children }) => (
        <View style={{ marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.profileDivider} />
            <Text style={{ color: C.text, lineHeight: 20 }}>{children}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.headerRow, { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color={C.text} />
                </TouchableOpacity>
                <Text style={[styles.sectionTitle, {flex: 1, textAlign: 'center'}]}>Help & About</Text>
                <View style={{width: 24}}/>
            </View>
            <ScrollView style={{ padding: 16 }}>
                <Section title="Frequently Asked Questions">
                    How do I post an alert?{"\n"}Only verified accounts like the municipality or council can post alerts to ensure information is trustworthy.
                    {"\n\n"}Is my data safe?{"\n"}All data is currently stored only on your device. We do not have a backend server.
                </Section>
                <Section title="Privacy Policy">
                    We respect your privacy. Yaka operates offline and does not collect or transmit your personal data. All posts, comments, and interactions are stored locally on your phone using AsyncStorage. If you choose to export your data, it is up to you to keep that file secure.
                </Section>
                <Section title="Terms of Use">
                    By using Yaka, you agree to be a respectful member of the community. Do not post spam, scams, or hateful content. Reports are reviewed based on community guidelines. This app is provided as-is without any warranties.
                </Section>
                <View style={styles.brandFoot}>
                    <Text style={styles.brandTag}>Yaka — The Local Digital Noticeboard</Text>
                    <Text style={styles.brandVer}>Build 2.0 • Full Refactor</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}