import { Alert, Text, View } from 'react-native';
import { dateToKey } from '../../core/dates';
import { upcomingOccasions } from '../../core/occasions';
import { HOLIDAY_KIND_LABELS, RELATIONS, RELATION_LABELS, type HolidayKind } from '../../core/types';
import { HOLIDAYS_KZ } from '../../data/holidaysKz';
import { ideasConfigured } from '../../services/ideasApi';
import { sendTestNotification, setupNotifications, syncReminders } from '../../services/notifications';
import { useStore } from '../../state/store';
import { Button, Card, Chips, Muted, Screen, SectionTitle, styles } from '../../ui/kit';

const LEAD_OPTIONS = [30, 14, 7, 3, 1, 0].map((d) => ({
  value: d,
  label:
    d === 0
      ? 'в тот же день'
      : d === 30
        ? 'за месяц'
        : d === 14
          ? 'за 2 недели'
          : d === 7
            ? 'за неделю'
            : d === 1
              ? 'за день'
              : `за ${d} дня`,
}));
const HOURS = [8, 9, 10, 12, 18, 20].map((h) => ({ value: h, label: `${h}:00` }));
const HOLIDAY_KINDS: HolidayKind[] = ['state', 'religious', 'professional', 'other'];

const toggle = (list: number[], value: number) =>
  list.includes(value) ? list.filter((d) => d !== value) : [...list, value].sort((a, b) => b - a);

export default function SettingsScreen() {
  const { data, updateSettings } = useStore();
  const { settings } = data;

  const testNotification = async () => {
    if (!(await setupNotifications())) {
      Alert.alert('Нет разрешения', 'Разрешите уведомления для приложения в настройках телефона.');
      return;
    }
    const [next] = upcomingOccasions(data, HOLIDAYS_KZ, dateToKey(new Date()), 400);
    await sendTestNotification(next?.id);
    const count = await syncReminders(data);
    Alert.alert('Готово', `Тестовое уведомление придёт через 5 секунд. Запланировано напоминаний: ${count}.`);
  };

  return (
    <Screen>
      <Card>
        <SectionTitle>Когда напоминать о днях рождения</SectionTitle>
        {RELATIONS.map((relation) => (
          <View key={relation}>
            <Text style={styles.label}>{RELATION_LABELS[relation]}</Text>
            <Chips
              options={LEAD_OPTIONS}
              value={settings.leadDays[relation]}
              onChange={(d) =>
                updateSettings({
                  leadDays: { ...settings.leadDays, [relation]: toggle(settings.leadDays[relation], d) },
                })
              }
            />
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle>Когда напоминать о праздниках</SectionTitle>
        {HOLIDAY_KINDS.map((kind) => (
          <View key={kind}>
            <Text style={styles.label}>{HOLIDAY_KIND_LABELS[kind]}</Text>
            <Chips
              options={LEAD_OPTIONS}
              value={settings.holidayLeadDays[kind]}
              onChange={(d) =>
                updateSettings({
                  holidayLeadDays: { ...settings.holidayLeadDays, [kind]: toggle(settings.holidayLeadDays[kind], d) },
                })
              }
            />
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle>Время уведомлений</SectionTitle>
        <Chips options={HOURS} value={settings.notifyHour} onChange={(h) => updateSettings({ notifyHour: h })} />
        <Button title="Проверить уведомления" variant="secondary" onPress={testNotification} />
      </Card>

      <Card>
        <SectionTitle>Язык поздравлений</SectionTitle>
        <Chips
          options={[
            { value: 'both', label: 'Оба языка' },
            { value: 'ru', label: 'Русский' },
            { value: 'kk', label: 'Қазақша' },
          ]}
          value={settings.greetingLanguage}
          onChange={(greetingLanguage) => updateSettings({ greetingLanguage })}
        />
        <Muted>
          {ideasConfigured
            ? 'Идеи подарков и поздравления генерирует Claude через ваш сервер.'
            : 'Сервер идей не настроен: напоминания работают, но идей от Claude не будет. См. README.'}
        </Muted>
      </Card>
    </Screen>
  );
}
