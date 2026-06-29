import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { DesktopSidebar } from '@/components/nav/desktop-sidebar';
import { Colors, Shadow } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  return ({ color }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={24} color={color} />
  );
}

/** Center "Sparky" AI button — larger, gradient, slightly raised. */
function sparkyIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.sparkWrap}>
      <LinearGradient
        colors={focused ? ['#FFB879', '#FF9D4B'] : ['#FF9D4B', '#166890']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sparkCircle}>
        <Ionicons name="sparkles" size={26} color={Colors.white} />
      </LinearGradient>
    </View>
  );
}

export default function TabsLayout() {
  const { isDesktop } = useBreakpoint();
  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: Colors.white,
          tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
          // On desktop the left sidebar replaces the bottom bar.
          tabBarStyle: isDesktop
            ? { display: 'none' }
            : {
                backgroundColor: Colors.primaryDark,
                borderTopWidth: 0,
                height: 64,
                paddingTop: 6,
              },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
        <Tabs.Screen name="data" options={{ title: 'My Data', tabBarIcon: tabIcon('stats-chart') }} />
        <Tabs.Screen name="sparky" options={{ title: 'Sparky', tabBarIcon: sparkyIcon }} />
        <Tabs.Screen
          name="community"
          options={{ title: 'Community', tabBarIcon: tabIcon('people') }}
        />
        <Tabs.Screen name="lessons" options={{ title: 'My Lessons', tabBarIcon: tabIcon('book') }} />
        {/* Profile is reached from the top-right avatar, not the tab bar. */}
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
      {isDesktop && <DesktopSidebar />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sparkWrap: { alignItems: 'center', justifyContent: 'center' },
  sparkCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    borderWidth: 3,
    borderColor: Colors.primaryDark,
    ...Shadow.card,
  },
});
