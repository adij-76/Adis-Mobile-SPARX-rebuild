import { Stack } from 'expo-router';

export default function LessonLayout() {
  // No centered Screen wrapper — the lesson screen manages its own responsive
  // two-column (content + collapsible outline) layout within the app shell.
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
