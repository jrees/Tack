import { Stack } from 'expo-router'

// Auth screens manage their own headers via SafeAreaView + custom chrome,
// so we hide the Stack navigator header globally for this group.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
