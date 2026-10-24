import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { planReminders } from '../core/reminders';
import type { AppData } from '../core/types';
import { HOLIDAYS_KZ } from '../data/holidaysKz';

const CHANNEL_ID = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Напоминания',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Отменяет все запланированные напоминания и ставит заново по текущим данным. */
export async function syncReminders(data: AppData): Promise<number> {
  if (Platform.OS === 'web') return 0;
  if (!(await Notifications.getPermissionsAsync()).granted) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const reminders = planReminders(data, HOLIDAYS_KZ, new Date());
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { occasionId: r.occasionId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fireAt, channelId: CHANNEL_ID },
    });
  }
  return reminders.length;
}

export async function sendTestNotification(occasionId?: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 Проверка напоминаний',
      body: occasionId ? 'Нажмите, чтобы открыть ближайший повод.' : 'Уведомления работают.',
      data: occasionId ? { occasionId } : {},
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
  });
}

export function occasionIdFromResponse(response: Notifications.NotificationResponse | null | undefined): string | null {
  const id = response?.notification.request.content.data?.occasionId;
  return typeof id === 'string' ? id : null;
}
