import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { occasionIdFromResponse, setupNotifications } from '../services/notifications';
import { StoreProvider } from '../state/store';
import { colors } from '../ui/kit';

function useOpenOccasionFromNotification() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const id = occasionIdFromResponse(response);
      // Сбрасываем, чтобы при следующем запуске приложение не открыло этот повод снова.
      Notifications.clearLastNotificationResponse();
      if (id) router.push({ pathname: '/occasion/[id]', params: { id, auto: '1' } });
    };
    // Приложение запустили нажатием на уведомление.
    open(Notifications.getLastNotificationResponse());
    // Нажали на уведомление, когда приложение уже было открыто.
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}

export default function RootLayout() {
  useEffect(() => {
    setupNotifications().catch((err) => console.warn('Уведомления недоступны', err));
  }, []);
  useOpenOccasionFromNotification();

  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: 'Назад',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="occasion/[id]" options={{ title: 'Повод' }} />
        <Stack.Screen name="person/[id]" options={{ title: 'Человек', presentation: 'modal' }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Дата', presentation: 'modal' }} />
      </Stack>
    </StoreProvider>
  );
}
