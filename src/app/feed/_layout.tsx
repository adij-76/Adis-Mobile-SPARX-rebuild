import { Stack } from 'expo-router';

export default function FeedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="new" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
