import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { RELATIONS, RELATION_LABELS, type CustomEvent, type Relation } from '../../core/types';
import { newId, useStore } from '../../state/store';
import { DayMonthInput, validateDayMonth, type DayMonthDraft } from '../../ui/DayMonthInput';
import { Button, Chips, Field, Muted, Screen, styles } from '../../ui/kit';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, ready } = useStore();
  if (!ready) return null;
  const existing = data.events.find((e) => e.id === id);
  return <EventForm key={existing?.id ?? 'new'} existing={existing} />;
}

function EventForm({ existing }: { existing?: CustomEvent }) {
  const { data, saveEvent, deleteEvent } = useStore();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState<DayMonthDraft>({
    day: existing ? String(existing.date.day) : '',
    month: existing?.date.month ?? new Date().getMonth() + 1,
    year: existing?.date.year ? String(existing.date.year) : '',
  });
  const [relation, setRelation] = useState<Relation>(existing?.relation ?? 'family');
  const [personId, setPersonId] = useState<string | undefined>(existing?.personId);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const save = () => {
    if (!title.trim()) return Alert.alert('Укажите название');
    const error = validateDayMonth(date);
    if (error) return Alert.alert('Дата', error);
    saveEvent({
      id: existing?.id ?? newId(),
      title: title.trim(),
      date: { day: Number(date.day), month: date.month, year: date.year ? Number(date.year) : undefined },
      relation,
      personId,
      notes: notes.trim() || undefined,
    });
    router.back();
  };

  const remove = () =>
    Alert.alert('Удалить дату?', existing?.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          deleteEvent(existing!.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? existing.title : 'Новая дата' }} />
      <Field label="Название" value={title} onChangeText={setTitle} placeholder="Годовщина свадьбы родителей" />
      <DayMonthInput
        label="Дата"
        value={date}
        onChange={setDate}
        yearHint="С годом покажем, какая это годовщина по счёту."
      />

      <Text style={styles.label}>Важность (как для кого напоминать)</Text>
      <Muted>Напоминания придут по тем же правилам, что и дни рождения этой группы.</Muted>
      <Chips
        options={RELATIONS.map((r) => ({ value: r, label: RELATION_LABELS[r] }))}
        value={relation}
        onChange={setRelation}
      />

      {data.people.length > 0 ? (
        <>
          <Text style={styles.label}>Кого касается (необязательно)</Text>
          <Chips
            options={data.people.map((p) => ({ value: p.id, label: p.name }))}
            value={personId ?? []}
            onChange={(pid) => setPersonId(personId === pid ? undefined : pid)}
          />
        </>
      ) : null}

      <Field label="Заметки" value={notes} onChangeText={setNotes} placeholder="Подробности для Claude" multiline />

      <Button title="Сохранить" onPress={save} />
      {existing ? <Button title="Удалить" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}
