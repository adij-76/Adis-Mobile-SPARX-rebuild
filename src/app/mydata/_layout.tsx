import { Stack } from 'expo-router';

export default function MyDataLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="wheel" />
      <Stack.Screen name="wheel-assessment" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="leaderboard" />
    </Stack>
  );
}
