import { Stack } from 'expo-router';

import { Screen } from '@/components/layout/screen';

export default function WorkshopLayout() {
  return (
    <Screen variant="modal">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="list" />
      </Stack>
    </Screen>
  );
}
