import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
        tabBarStyle: {
          backgroundColor: Colors.primaryDark,
          borderTopWidth: 0,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.medium,
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="data"
        options={{ title: 'My Data', tabBarIcon: tabIcon('stats-chart') }}
      />
      <Tabs.Screen
        name="lessons"
        options={{ title: 'My Lessons', tabBarIcon: tabIcon('book') }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: 'Community', tabBarIcon: tabIcon('people') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person') }}
      />
    </Tabs>
  );
}
