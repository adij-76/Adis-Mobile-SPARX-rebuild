import { Stack } from 'expo-router';

import { Screen } from '@/components/layout/screen';

export default function ModuleLayout() {
  return (
    <Screen variant="modal">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="[id]" />
      </Stack>
    </Screen>
  );
}
