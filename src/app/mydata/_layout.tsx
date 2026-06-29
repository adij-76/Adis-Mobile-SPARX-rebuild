import { Stack } from 'expo-router';

import { Screen } from '@/components/layout/screen';

export default function MyDataLayout() {
  return (
    <Screen variant="modal">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="wheel" />
        <Stack.Screen name="wheel-assessment" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="leaderboard" />
      </Stack>
    </Screen>
  );
}
