import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="repair-orders/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: "#1E3A56" },
            headerTintColor: "#FFFFFF",
            title: "Repair Order",
          }}
        />
      </Stack>
    </>
  );
}
