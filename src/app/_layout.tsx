import {
  Lato_400Regular,
  Lato_700Bold,
  Lato_900Black,
  useFonts,
} from '@expo-google-fonts/lato';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesktopSidebar } from '@/components/nav/desktop-sidebar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { AppStoreProvider } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

/**
 * App shell. On desktop the sidebar is fixed and persistent for every route —
 * only the content area (the navigator) swaps. On phone/tablet the navigator
 * renders full-screen and the bottom tab bar handles navigation.
 */
function Shell() {
  const { isDesktop } = useBreakpoint();
  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workshop" options={{ presentation: 'card' }} />
      <Stack.Screen name="meetings" options={{ presentation: 'card' }} />
      <Stack.Screen name="videos" options={{ presentation: 'card' }} />
      <Stack.Screen name="quotes" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen
        name="checkin"
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="mydata" options={{ presentation: 'card' }} />
      <Stack.Screen name="feed" options={{ presentation: 'card' }} />
      <Stack.Screen name="settings" options={{ presentation: 'card' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
      <Stack.Screen name="favorites" options={{ presentation: 'card' }} />
      <Stack.Screen name="pwa-install" options={{ presentation: 'card' }} />
    </Stack>
  );

  if (!isDesktop) return stack;

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <DesktopSidebar />
      <View style={{ flex: 1 }}>{stack}</View>
    </View>
  );
}

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
        <AppStoreProvider>
          <StatusBar style="auto" />
          <Shell />
        </AppStoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
