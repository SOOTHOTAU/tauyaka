// src/screens/CreatePost.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { usePrefs } from '../context/PreferencesContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useData } from '../context/DataContext.js';
import { useToast } from '../context/ToastContext.js';
import { canEditPost } from '../utils/posts.js';

export default function CreatePost() {
  const { C, styles, t } = usePrefs();
  const { activeIdentity } = useAuth();
  const { posts, setPosts } = useData();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const route = useRoute();

  const editPost = route.params?.editPost || null;
  const isEditing = !!editPost;
  const editable = isEditing ? canEditPost(editPost) : true;

  const [title, setTitle] = useState(editPost?.title || '');
  const [message, setMessage] = useState(editPost?.message || '');
  const [category, setCategory] = useState(editPost?.category || 'community');

  useEffect(() => {
    if (isEditing && !editable) {
      showToast("You can only edit a post within 1 hour of posting.");
    }
  }, [isEditing, editable, showToast]);

  const onSave = () => {
    const cleanTitle = (title || '').trim();
    const cleanMsg = (message || '').trim();
    if (!cleanTitle || !cleanMsg) {
      showToast("Please enter a title and message.");
      return;
    }

    if (isEditing) {
      if (!editable) {
        showToast("Edit window has expired.");
        return;
      }
      setPosts(prev => prev.map(p => p.id === editPost.id ? { ...p, title: cleanTitle, message: cleanMsg, category } : p));
      showToast("Post updated.");
    } else {
      const newPost = {
        id: `p_${Date.now()}`,
        authorId: activeIdentity.id,
        author: activeIdentity.name || 'You',
        title: cleanTitle,
        message: cleanMsg,
        category,
        timestamp: Date.now(),
        reactions: { helpful: 0 },
        images: [],
      };
      setPosts(prev => [newPost, ...prev]);
      showToast("Post created.");
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 46, alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.sectionTitle, { flex: 1, textAlign: 'center' }]}>
          {isEditing ? (t.editPost || 'Edit Post') : (t.createPost || 'Create Post')}
        </Text>
        <View style={{ width: 46 }} />
      </View>

      {/* Form */}
      <View style={{ padding: 12, gap: 12 }}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t.title || 'Title'}
          placeholderTextColor={C.subtext}
          editable={!isEditing || editable}
        />
        <TextInput
          style={[styles.input, { height: 160 }]}
          value={message}
          onChangeText={setMessage}
          placeholder={t.message || 'Write something helpful…'}
          placeholderTextColor={C.subtext}
          multiline
          editable={!isEditing || editable}
        />
        {/* You can add a category picker here if you have one; for now a simple hint */}
        <Text style={{ color: C.subtext }}>Category: {category}</Text>

        <TouchableOpacity
          onPress={onSave}
          style={[styles.primaryBtn, { opacity: (!isEditing || editable) ? 1 : 0.6 }]}
          disabled={isEditing && !editable}
        >
          <Text style={styles.primaryBtnText}>{isEditing ? (t.save || 'Save') : (t.post || 'Post')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
