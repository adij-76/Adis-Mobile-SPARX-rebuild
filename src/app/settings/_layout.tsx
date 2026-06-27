import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="theme" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="languages" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="add-card" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="faqs" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="assessment-summary" />
    </Stack>
  );
}
