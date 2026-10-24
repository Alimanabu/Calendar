import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { formatDayMonth } from '../../core/dates';
import { RELATIONS, RELATION_LABELS } from '../../core/types';
import { useStore } from '../../state/store';
import { Button, Card, Muted, Row, Screen, SectionTitle, styles } from '../../ui/kit';

const openPerson = (id: string) => router.push({ pathname: '/person/[id]', params: { id } });
const openEvent = (id: string) => router.push({ pathname: '/event/[id]', params: { id } });

export default function PeopleScreen() {
  const { data } = useStore();

  return (
    <Screen>
      <Button title="+ Добавить человека" onPress={() => openPerson('new')} />
      <Button title="+ Добавить дату (годовщина и т.п.)" variant="secondary" onPress={() => openEvent('new')} />

      {RELATIONS.map((relation) => {
        const people = data.people.filter((p) => p.relation === relation).sort((a, b) => a.name.localeCompare(b.name));
        if (people.length === 0) return null;
        return (
          <Card key={relation}>
            <SectionTitle>{RELATION_LABELS[relation]}</SectionTitle>
            {people.map((p) => (
              <Row key={p.id} onPress={() => openPerson(p.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{p.name}</Text>
                  <Muted>
                    🎂 {formatDayMonth(p.birthday.month, p.birthday.day)}
                    {p.birthday.year ? ` ${p.birthday.year}` : ''}
                    {p.interests ? ` · ${p.interests}` : ''}
                  </Muted>
                </View>
              </Row>
            ))}
          </Card>
        );
      })}

      {data.events.length > 0 ? (
        <Card>
          <SectionTitle>Другие даты</SectionTitle>
          {data.events.map((e) => (
            <Row key={e.id} onPress={() => openEvent(e.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{e.title}</Text>
                <Muted>📅 {formatDayMonth(e.date.month, e.date.day)}</Muted>
              </View>
            </Row>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
