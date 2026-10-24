import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { dateToKey, daysBetween, formatAge, formatDaysLeft, formatKey } from '../../core/dates';
import { findOccasion } from '../../core/occasions';
import { HOLIDAY_KIND_LABELS, RELATION_LABELS, type AppData, type Occasion } from '../../core/types';
import { HOLIDAYS_KZ } from '../../data/holidaysKz';
import { useStore } from '../../state/store';
import { Badge, Card, Muted, Row, Screen, SectionTitle, colors, styles } from '../../ui/kit';

export default function OccasionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, ready } = useStore();
  if (!ready) return null;
  const occasion = findOccasion(data, HOLIDAYS_KZ, id);
  if (!occasion) {
    return (
      <Screen>
        <Muted>Этот повод больше не найден — возможно, человека или дату удалили.</Muted>
      </Screen>
    );
  }
  return <OccasionDetails occasion={occasion} data={data} />;
}

function OccasionDetails({ occasion, data }: { occasion: Occasion; data: AppData }) {
  const today = dateToKey(new Date());
  const days = daysBetween(today, occasion.date);
  const holiday = HOLIDAYS_KZ.find((h) => occasion.kind === 'holiday' && h.id === occasion.sourceId);
  const people = occasion.personIds.map((pid) => data.people.find((p) => p.id === pid)).filter((p) => p !== undefined);

  return (
    <Screen>
      <Stack.Screen options={{ title: occasion.kind === 'birthday' ? 'День рождения' : 'Повод' }} />
      <Card>
        <Text style={[styles.title, { fontSize: 22, marginBottom: 6 }]}>{occasion.title}</Text>
        <Muted>
          {formatKey(occasion.date)}
          {occasion.turningAge ? ` · ${formatAge(occasion.turningAge)}` : ''}
        </Muted>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge label={formatDaysLeft(days)} color={colors.accent} />
          {holiday ? <Badge label={HOLIDAY_KIND_LABELS[holiday.kind]} color={colors.muted} /> : null}
          {holiday?.dayOff ? <Badge label="выходной" color={colors.muted} /> : null}
        </View>
        {holiday?.note ? <Text style={[styles.muted, { marginTop: 8 }]}>{holiday.note}</Text> : null}
      </Card>

      {people.length > 0 ? (
        <Card>
          <SectionTitle>Кого поздравить</SectionTitle>
          {people.map((p) => (
            <Row key={p.id} onPress={() => router.push({ pathname: '/person/[id]', params: { id: p.id } })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.body}>{p.name}</Text>
                <Muted>
                  {RELATION_LABELS[p.relation]}
                  {p.notes ? ` · ${p.notes}` : ''}
                </Muted>
              </View>
              <Text style={{ color: colors.muted }}>›</Text>
            </Row>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
