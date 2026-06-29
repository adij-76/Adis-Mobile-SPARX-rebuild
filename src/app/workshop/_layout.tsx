import { Stack } from 'expo-router';

import { Screen } from '@/components/layout/screen';

export default function WorkshopLayout() {
  return (
    <Screen variant="modal">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="list" />
        <Stack.Screen name="intro" />
        <Stack.Screen name="video" />
        <Stack.Screen name="worksheet" />
        <Stack.Screen name="summary" options={{ animation: 'fade' }} />
      </Stack>
    </Screen>
  );
}
