import React, { useState, useRef, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { usePrefs } from '../context/PreferencesContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useChat } from '../context/ChatContext.js';
import { relTime } from '../utils/time.js';

export default function ChatThreadScreen({ route, navigation }) {
  const { chatId, name } = route.params;
  const { C, styles, t } = usePrefs();
  const { user } = useAuth();
  const { messages, sendMessage } = useChat();
  
  const [text, setText] = useState("");
  const listRef = useRef(null);

  const threadMessages = messages[chatId] || [];

  useEffect(() => {
    navigation.setOptions({ headerShown: true, title: name });
  }, [name, navigation]);

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(chatId, text.trim());
      setText("");
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={[styles.modalFull, { paddingTop: 0 }]} edges={['bottom', 'left', 'right']}>
        <View style={[styles.headerRow, { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth:1, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top:8, bottom:8, left:8, right:8}}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { flex: 1, textAlign: "center" }]}>{name}</Text>
          <View style={{width: 24}}/>
        </View>
        
        <FlatList
          ref={listRef}
          data={threadMessages}
          keyExtractor={item => item.id}
          inverted
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'column-reverse' }}
          renderItem={({item}) => {
            const isMe = item.fromUserId === user.id;
            return (
              <View style={{ marginVertical: 4, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <View style={{
                  backgroundColor: isMe ? C.primary : C.soft,
                  padding: 10,
                  borderRadius: 12,
                  maxWidth: '80%',
                }}>
                  <Text style={{ color: isMe ? '#fff' : C.text }}>{item.text}</Text>
                  <Text style={{ color: isMe ? '#ffffff99' : C.subtext, fontSize: 10, alignSelf: 'flex-end', marginTop: 4 }}>{relTime(item.time)}</Text>
                </View>
              </View>
            )
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderTopWidth: 1, borderTopColor: C.border }}>
          <TextInput
            style={[styles.input, { flex: 1, marginTop: 0 }]}
            placeholder={t.addComment}
            placeholderTextColor={C.subtext}
            value={text}
            onChangeText={setText}
            blurOnSubmit={false}
          />
          <TouchableOpacity onPress={handleSend} style={styles.primaryBtn}>
            <Ionicons name="send" size={18} color="#fff"/>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}