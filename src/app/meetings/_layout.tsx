import { Stack } from 'expo-router';

import { Screen } from '@/components/layout/screen';

export default function MeetingsLayout() {
  return (
    <Screen variant="modal">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="book" />
        <Stack.Screen name="[id]" />
      </Stack>
    </Screen>
  );
}
