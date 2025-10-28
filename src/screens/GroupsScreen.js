// src/screens/GroupsScreen.js
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePrefs } from '../context/PreferencesContext.js';
import { useData } from '../context/DataContext.js';
import { useAuth } from '../context/AuthContext.js';
import HeaderBell from '../components/HeaderBell.js';
import { relTime } from '../utils/time.js';

const Tab = createMaterialTopTabNavigator();
const asArray  = (v) => (Array.isArray(v) ? v : []);
const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

const GroupList = ({ groups, onGroupPress, emptyMessage, isMemberCheck }) => {
  const { C, styles } = usePrefs();
  const data = asArray(groups);

  return (
    <FlatList
      data={data}
      keyExtractor={(item, idx) => String(item?.id ?? idx)}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.groupItem} onPress={() => onGroupPress(item)}>
          <View style={[styles.profileAvatar, { width: 48, height: 48, marginRight: 12, borderWidth: 0 }]}>
            <Ionicons name={item?.icon || 'people-outline'} size={28} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.commentAuthor} numberOfLines={1}>{item?.name || 'Group'}</Text>
            <Text style={{ color: C.subtext }} numberOfLines={2}>{item?.description || ''}</Text>
          </View>
          <Ionicons
            name={isMemberCheck(item?.id) ? 'checkmark-circle' : 'chevron-forward'}
            size={22}
            color={isMemberCheck(item?.id) ? C.primary : C.subtext}
          />
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', marginTop: 40, color: C.subtext }}>
          {emptyMessage}
        </Text>
      }
    />
  );
};

const MyGroupsTab = ({ onGroupPress }) => {
  const { t } = usePrefs();
  const { groups, groupMemberships } = useData();
  const { activeIdentity } = useAuth();
  const uid = activeIdentity?.id;

  const src = asArray(groups);
  const memberships = asObject(groupMemberships);

  const myGroups = useMemo(
    () => src.filter((g) => asArray(memberships[g.id]).includes(uid)),
    [src, memberships, uid]
  );
  const isMemberCheck = useCallback(
    (groupId) => asArray(memberships[groupId]).includes(uid),
    [memberships, uid]
  );

  return (
    <GroupList
      groups={myGroups}
      onGroupPress={onGroupPress}
      emptyMessage={t?.noGroupsJoined || 'No groups joined yet.'}
      isMemberCheck={isMemberCheck}
    />
  );
};

const ExploreGroupsTab = ({ onGroupPress }) => {
  const { t } = usePrefs();
  const { groups, groupMemberships } = useData();
  const { activeIdentity } = useAuth();
  const uid = activeIdentity?.id;

  const src = asArray(groups);
  const memberships = asObject(groupMemberships);

  const otherGroups = useMemo(
    () => src.filter((g) => !asArray(memberships[g.id]).includes(uid)),
    [src, memberships, uid]
  );
  const isMemberCheck = useCallback(
    (groupId) => asArray(memberships[groupId]).includes(uid),
    [memberships, uid]
  );

  return (
    <GroupList
      groups={otherGroups}
      onGroupPress={onGroupPress}
      emptyMessage={t?.noGroupsExplore || 'Nothing to explore yet.'}
      isMemberCheck={isMemberCheck}
    />
  );
};

export default function GroupsScreen() {
  const { C, styles, t } = usePrefs();
  const { activeIdentity, allUsers } = useAuth();
  const uid = activeIdentity?.id;

  const {
    groups, setGroups,
    groupMemberships, setGroupMemberships,
    groupPosts, setGroupPosts,
    createGroup, deleteGroup, joinGroup, leaveGroup, postToGroup, broadcastToGroup,
  } = useData();

  // --- All hooks at top level (no conditionals!) ---
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isCreateVisible, setCreateVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPost, setNewGroupPost] = useState('');

  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');

  const memberships = asObject(groupMemberships);
  const selectedMembers = asArray(memberships[selectedGroup?.id]);
  const isMember  = !!(uid && selectedGroup && selectedMembers.includes(uid));
  const isCreator = !!(uid && selectedGroup && selectedGroup.creatorId === uid);

  const selectedPosts = useMemo(() => {
    const gp = asObject(groupPosts);
    const arr = selectedGroup ? asArray(gp[selectedGroup.id]) : [];
    return arr.slice().sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));
  }, [groupPosts, selectedGroup?.id]);

  const onJoin = useCallback(() => {
    if (!selectedGroup || !uid) return;
    joinGroup(selectedGroup.id, uid);
  }, [selectedGroup, uid, joinGroup]);

  const onLeave = useCallback(() => {
    if (!selectedGroup || !uid) return;
    leaveGroup(selectedGroup.id, uid);
  }, [selectedGroup, uid, leaveGroup]);

  const onDelete = useCallback(() => {
    if (!selectedGroup) return;
    Alert.alert("Delete group?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteGroup(selectedGroup.id); setSelectedGroup(null); } },
    ]);
  }, [selectedGroup, deleteGroup]);

  const onPost = useCallback(() => {
    const txt = (newGroupPost || '').trim();
    if (!txt || !selectedGroup || !uid) return;
    postToGroup(selectedGroup.id, uid, txt);
    setNewGroupPost('');
  }, [newGroupPost, selectedGroup, uid, postToGroup]);

  const onBroadcast = useCallback(() => {
    if (!selectedGroup) return;
    const title = (broadcastTitle || selectedGroup.name || 'Group message').trim();
    const body  = (broadcastMsg || '').trim();
    if (!title && !body) return;
    broadcastToGroup(selectedGroup.id, title, body);
    setBroadcastTitle(''); setBroadcastMsg(''); setBroadcastVisible(false);
    Alert.alert("Sent", "Broadcast sent to group.");
  }, [selectedGroup, broadcastTitle, broadcastMsg, broadcastToGroup]);

  // --- Conditional rendering is fine; hooks above run every render ---
  if (selectedGroup) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.headerRow, { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => setSelectedGroup(null)}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
            {selectedGroup.name}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={selectedPosts}
          keyExtractor={(item, idx) => String(item?.id ?? idx)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.commentHeader}>
                <Text style={styles.author}>{asObject(allUsers)[item.authorId]?.name || 'User'}</Text>
                <Text style={styles.commentTime}>{relTime(item.timestamp)}</Text>
              </View>
              <Text style={styles.cardMsg}>{item.text}</Text>
            </View>
          )}
          ListHeaderComponent={
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ color: C.text, marginBottom: 8 }}>{selectedGroup.description}</Text>
              <Text style={{ color: C.subtext }}>{selectedMembers.length} members</Text>

              {/* Join / Leave */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    alignSelf: 'stretch',
                    alignItems: 'center',
                    marginTop: 12,
                    backgroundColor: isMember ? C.soft : C.primary,
                  },
                ]}
                onPress={isMember ? onLeave : onJoin}
              >
                <Text style={[styles.primaryBtnText, isMember && { color: C.error }]}>
                  {isMember ? (t?.leaveGroup || "Leave group") : (t?.joinGroup || "Join group")}
                </Text>
              </TouchableOpacity>

              {/* Creator actions */}
              {isCreator && (
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => setBroadcastVisible(true)}
                    style={[styles.secondaryBtn, { flex: 1, marginRight: 8 }]}
                  >
                    <Text style={{ color: C.text, fontWeight: '800' }}>Broadcast</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onDelete}
                    style={[styles.secondaryBtn, { flex: 1, borderColor: C.error }]}
                  >
                    <Text style={{ color: C.error, fontWeight: '800' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40, color: C.subtext }}>
              No posts in this group yet.
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 90 }}
        />

        {/* Post composer (members only) */}
        {isMember && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 8,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <TextInput
              style={[styles.input, { flex: 1, marginTop: 0, marginRight: 8 }]}
              placeholder="Post to group..."
              placeholderTextColor={C.subtext}
              value={newGroupPost}
              onChangeText={setNewGroupPost}
            />
            <TouchableOpacity onPress={onPost} style={styles.primaryBtn}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Broadcast modal (creator only) */}
        <Modal transparent visible={broadcastVisible} onRequestClose={() => setBroadcastVisible(false)} animationType="slide">
          <View style={styles.loginModal}>
            <View style={styles.loginContainer}>
              <Text style={styles.loginTitle}>Broadcast to members</Text>
              <TextInput
                style={styles.input}
                placeholder="Title (optional)"
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
              />
              <TextInput
                style={[styles.input, { height: 90 }]}
                placeholder="Message"
                value={broadcastMsg}
                onChangeText={setBroadcastMsg}
                multiline
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setBroadcastVisible(false)}>
                  <Text style={styles.cancel}>{t?.cancel || "Cancel"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onBroadcast} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ----- List view (My / Explore) -----
  const openCreate = () => setCreateVisible(true);
  const doCreate = () => {
    const name = (newGroupName || "").trim();
    const desc = (newGroupDesc || "").trim();
    if (name.length < 3) {
      Alert.alert("Invalid Name", "Group name must be at least 3 characters long.");
      return;
    }
    const g = createGroup(uid, name, desc, 'add-circle-outline');
    setCreateVisible(false);
    setNewGroupName(''); setNewGroupDesc('');
    if (g) setSelectedGroup(g);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerRow, { paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border }]}>
        <HeaderBell />
        <Text style={[styles.sectionTitle, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {t?.navGroups || 'Groups'}
        </Text>
        <TouchableOpacity onPress={openCreate} style={{ width: 46, alignItems: 'center' }}>
          <Ionicons name="add" size={28} color={C.primary}/>
        </TouchableOpacity>
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.subtext,
          tabBarIndicatorStyle: { backgroundColor: C.primary },
          tabBarStyle: { backgroundColor: C.bg },
          tabBarLabelStyle: { fontWeight: 'bold' },
        }}
      >
        <Tab.Screen name="MyGroups" options={{ title: t?.myGroups || "My Groups" }}>
          {() => <MyGroupsTab onGroupPress={setSelectedGroup} />}
        </Tab.Screen>
        <Tab.Screen name="Explore" options={{ title: t?.explore || "Explore" }}>
          {() => <ExploreGroupsTab onGroupPress={setSelectedGroup} />}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Create modal */}
      <Modal transparent visible={isCreateVisible} onRequestClose={() => setCreateVisible(false)} animationType="slide">
        <View style={styles.loginModal}>
          <View style={styles.loginContainer}>
            <Text style={styles.loginTitle}>{t?.createGroup || "Create Group"}</Text>
            <TextInput
              style={styles.input}
              placeholder={t?.groupName || "Group name"}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder={t?.groupDesc || "Short description"}
              value={newGroupDesc}
              onChangeText={setNewGroupDesc}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCreateVisible(false)}>
                <Text style={styles.cancel}>{t?.cancel || "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doCreate} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>{t?.createGroup || "Create Group"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
