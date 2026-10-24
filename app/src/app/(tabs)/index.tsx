import { router } from 'expo-router';
import { Text } from 'react-native';
import { dateToKey, daysBetween } from '../../core/dates';
import { upcomingOccasions } from '../../core/occasions';
import { HOLIDAYS_KZ } from '../../data/holidaysKz';
import { useStore } from '../../state/store';
import { Button, Card, Muted, Screen, SectionTitle, styles } from '../../ui/kit';
import { OccasionRow } from '../../ui/OccasionRow';

const GROUPS = [
  { title: 'На этой неделе', from: 0, to: 7 },
  { title: 'В ближайший месяц', from: 8, to: 31 },
  { title: 'Через 1–3 месяца', from: 32, to: 92 },
];

export default function UpcomingScreen() {
  const { data, ready } = useStore();
  const today = dateToKey(new Date());
  if (!ready) return <Screen>{null}</Screen>;

  const occasions = upcomingOccasions(data, HOLIDAYS_KZ, today, 92);

  return (
    <Screen>
      {data.people.length === 0 ? (
        <Card>
          <Text style={[styles.title, { marginBottom: 6 }]}>Добро пожаловать!</Text>
          <Muted>
            Добавьте родных, друзей и коллег — календарь напомнит о днях рождения заранее: семье за месяц, друзьям за
            неделю. Напоминания придут, даже если приложение закрыто.
          </Muted>
          <Button
            title="Добавить человека"
            onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'new' } })}
          />
        </Card>
      ) : null}

      {GROUPS.map((group) => {
        const items = occasions.filter((o) => {
          const d = daysBetween(today, o.date);
          return d >= group.from && d <= group.to;
        });
        if (items.length === 0) return null;
        return (
          <Card key={group.title}>
            <SectionTitle>{group.title}</SectionTitle>
            {items.map((o) => (
              <OccasionRow key={o.id} occasion={o} data={data} today={today} />
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
