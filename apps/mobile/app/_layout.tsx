import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#22c55e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Mealing About',
          }}
        />
        <Stack.Screen
          name="restaurants"
          options={{
            title: 'Nearby Restaurants',
          }}
        />
        <Stack.Screen
          name="menu/[placeId]"
          options={{
            title: 'Menu Analysis',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
