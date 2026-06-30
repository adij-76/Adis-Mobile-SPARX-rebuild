import {
  Lato_400Regular,
  Lato_700Bold,
  Lato_900Black,
  useFonts,
} from '@expo-google-fonts/lato';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesktopSidebar } from '@/components/nav/desktop-sidebar';
import { Colors } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppStoreProvider } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

/**
 * App shell. On desktop the sidebar is fixed and persistent for every route —
 * only the content area (the navigator) swaps. On phone/tablet the navigator
 * renders full-screen and the bottom tab bar handles navigation.
 */
/** Routes that take over the whole screen with no nav — must be completed
 *  or explicitly closed, not navigated away from (e.g. the daily check-in). */
const NAV_LOCKED = ['/checkin'];

/** Brand splash shown while auth resolves / before the login redirect lands,
 *  so protected content never flashes for a signed-out visitor. */
function Splash() {
  return (
    <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={[StyleSheet.absoluteFill, styles.splash]}>
      <View style={styles.splashLogo}>
        <Ionicons name="sparkles" size={28} color={Colors.white} />
      </View>
      <ActivityIndicator color={Colors.white} />
    </LinearGradient>
  );
}

function Shell() {
  const { isDesktop } = useBreakpoint();
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const onLogin = segments[0] === 'login';

  // Redirect by auth state once it resolves: guests → login, signed-in → app.
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'guest' && !onLogin) router.replace('/login');
    else if (status === 'authed' && onLogin) router.replace('/');
  }, [status, onLogin, router]);

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="workshop" options={{ presentation: 'card' }} />
      <Stack.Screen name="meetings" options={{ presentation: 'card' }} />
      <Stack.Screen name="videos" options={{ presentation: 'card' }} />
      <Stack.Screen name="quotes" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen
        name="checkin"
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="mydata" options={{ presentation: 'card' }} />
      <Stack.Screen name="lesson" options={{ presentation: 'card' }} />
      <Stack.Screen name="feed" options={{ presentation: 'card' }} />
      <Stack.Screen name="settings" options={{ presentation: 'card' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
      <Stack.Screen name="favorites" options={{ presentation: 'card' }} />
      <Stack.Screen name="pwa-install" options={{ presentation: 'card' }} />
    </Stack>
  );

  // Always render the row + content wrappers (on every breakpoint) so the
  // navigator never remounts when resizing across the desktop threshold — only
  // the sidebar's presence is toggled. It shows on desktop for signed-in app
  // routes, never on the login screen, nav-locked routes, or phone/tablet.
  const navLocked = NAV_LOCKED.some((r) => segments[0] && `/${segments[0]}`.startsWith(r));
  const showSidebar = isDesktop && !navLocked && !onLogin && status === 'authed';
  // Cover protected content while loading or during the guest→login redirect.
  const covering = status === 'loading' || (status === 'guest' && !onLogin);
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {showSidebar && <DesktopSidebar />}
      <View style={{ flex: 1 }}>{stack}</View>
      {covering && <Splash />}
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { alignItems: 'center', justifyContent: 'center', gap: 20 },
  splashLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Lato_400Regular,
    Lato_700Bold,
    Lato_900Black,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppStoreProvider>
            <StatusBar style="auto" />
            <Shell />
          </AppStoreProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
