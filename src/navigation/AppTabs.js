// src/navigation/AppTabs.js
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MessagesStack from './MessagesStack.js';
// …other imports

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      {/* other tabs */}
      <Tab.Screen name="Messages" component={MessagesStack} />
      {/* other tabs */}
    </Tab.Navigator>
  );
}
