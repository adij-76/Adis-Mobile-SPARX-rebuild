import { Stack } from 'expo-router';

/** The onboarding flow is a single self-contained wizard screen. Gestures are
 *  disabled so a new user can't swipe out of the gate before finishing. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
