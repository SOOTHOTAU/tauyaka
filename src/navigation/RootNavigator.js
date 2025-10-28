// src/navigation/RootNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Platform, StatusBar } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Contexts & Hooks
import { usePrefs } from '../context/PreferencesContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useData } from '../context/DataContext.js';

// Screens
import HomeScreen from '../screens/HomeScreen.js';
import MessagesScreen from '../screens/Messages/InboxScreen.js';
import ChatThreadScreen from '../screens/Messages/ChatThreadScreen.js';
import GroupsScreen from '../screens/GroupsScreen.js';
import MarketplaceScreen from '../screens/MarketplaceScreen.js';
import ProfileScreen from '../screens/ProfileScreen.js';
import SavedScreen from '../screens/SavedScreen.js';
import AlertsScreen from '../screens/AlertsScreen.js';
import MyPostsScreen from '../screens/MyPostsScreen.js';
import ArchiveScreen from '../screens/ArchiveScreen.js';
import LoginScreen from '../screens/LoginScreen.js';
import NotificationsScreen from '../screens/NotificationsScreen.js';

// Modals
import CreatePostModal from '../components/modals/CreatePostModal.js';
import CommentsScreen from '../screens/modals/CommentsScreen.js';
import ProfilePreviewScreen from '../screens/modals/ProfilePreviewScreen.js';
import SettingsAndPreferencesScreen from '../screens/modals/SettingsAndPreferencesScreen.js';
import HelpAboutScreen from '../screens/modals/HelpAboutScreen.js';

// ✅ NEW: Storefront route import
import StorefrontScreen from '../screens/StorefrontScreen.js';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const GroupsStack = createNativeStackNavigator();
const MarketStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const screenOptions = { headerShown: false };

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="HomeRoot" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

function MessagesStackNavigator() {
  return (
    <MessagesStack.Navigator screenOptions={screenOptions}>
      <MessagesStack.Screen name="Inbox" component={MessagesScreen} />
      <MessagesStack.Screen name="ChatThread" component={ChatThreadScreen} />
    </MessagesStack.Navigator>
  );
}

function GroupsStackNavigator() {
  return (
    <GroupsStack.Navigator screenOptions={screenOptions}>
      <GroupsStack.Screen name="GroupsRoot" component={GroupsScreen} />
    </GroupsStack.Navigator>
  );
}

function MarketStackNavigator() {
  return (
    <MarketStack.Navigator screenOptions={screenOptions}>
      <MarketStack.Screen name="MarketRoot" component={MarketplaceScreen} />
    </MarketStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen name="ProfileRoot" component={ProfileScreen} />
      <ProfileStack.Screen name="SavedPosts" component={SavedScreen} />
      <ProfileStack.Screen name="MyPosts" component={MyPostsScreen} />
      <ProfileStack.Screen name="Archive" component={ArchiveScreen} />
    </ProfileStack.Navigator>
  );
}

function BottomTabNavigator() {
  const { C, styles, t } = usePrefs();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const iconMap = {
            Home: focused ? 'home' : 'home-outline',
            Messages: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Groups: focused ? 'people' : 'people-outline',
            Marketplace: focused ? 'cart' : 'cart-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={iconMap[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.text,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
          height: Platform.OS === 'ios' ? 94 : 100,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          paddingBottom: Platform.OS === 'ios' ? 34 : 14,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ tabBarLabel: t.navHome }} />
      <Tab.Screen name="Messages" component={MessagesStackNavigator} options={{ tabBarLabel: t.navMessages }} />
      <Tab.Screen name="Groups" component={GroupsStackNavigator} options={{ tabBarLabel: t.navGroups }} />
      <Tab.Screen name="Marketplace" component={MarketStackNavigator} options={{ tabBarLabel: t.navMarket }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ tabBarLabel: t.navProfile }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { booting } = useData();
  const { C, styles } = usePrefs();
  const { isLoggedIn, isLoadingAuth } = useAuth();

  if (booting || isLoadingAuth) {
    const SkeletonCard = () => (
      <View style={styles.skelCard}>
        <View style={[styles.skelLineWide, { width: '60%', backgroundColor: C.border }]} />
        <View style={[styles.skelLine, { width: '80%', backgroundColor: C.border }]} />
        <View style={[styles.skelLine, { width: '75%', backgroundColor: C.border }]} />
      </View>
    );
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={C.theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
        <View style={{ padding: 16 }}>
          <Text style={[styles.headerTitle, { textAlign: 'left', marginBottom: 16 }]}>Loading Yaka...</Text>
        </View>
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle={C.theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {/* Tabs */}
            <Stack.Screen name="Main" component={BottomTabNavigator} />

            {/* Global screens (reachable from anywhere) */}
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ presentation: 'card', headerShown: false }}
            />

            {/* Modals */}
            <Stack.Screen name="Alerts" component={AlertsScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="CreatePost" component={CreatePostModal} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Comments" component={CommentsScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="ProfilePreview" component={ProfilePreviewScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Settings" component={SettingsAndPreferencesScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="HelpAbout" component={HelpAboutScreen} options={{ presentation: 'modal' }} />

            {/* ✅ NEW: Storefront route (tap seller name in Marketplace/Sponsored) */}
            <Stack.Screen
              name="Storefront"
              component={StorefrontScreen}
              options={{ presentation: 'card', headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </>
  );
}
