import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { RELATIONS, RELATION_LABELS, type Person, type Relation } from '../../core/types';
import { HOLIDAYS_KZ } from '../../data/holidaysKz';
import { newId, useStore } from '../../state/store';
import { DayMonthInput, validateDayMonth, type DayMonthDraft } from '../../ui/DayMonthInput';
import { Button, Chips, Field, Muted, Screen, styles } from '../../ui/kit';

const PROFESSIONAL = HOLIDAYS_KZ.filter((h) => h.kind === 'professional');

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, ready } = useStore();
  if (!ready) return null;
  const existing = data.people.find((p) => p.id === id);
  return <PersonForm key={existing?.id ?? 'new'} existing={existing} />;
}

function PersonForm({ existing }: { existing?: Person }) {
  const { savePerson, deletePerson } = useStore();
  const [name, setName] = useState(existing?.name ?? '');
  const [relation, setRelation] = useState<Relation>(existing?.relation ?? 'family');
  const [birthday, setBirthday] = useState<DayMonthDraft>({
    day: existing ? String(existing.birthday.day) : '',
    month: existing?.birthday.month ?? new Date().getMonth() + 1,
    year: existing?.birthday.year ? String(existing.birthday.year) : '',
  });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [professions, setProfessions] = useState<string[]>(existing?.professionHolidayIds ?? []);

  const save = () => {
    if (!name.trim()) return Alert.alert('Укажите имя');
    const error = validateDayMonth(birthday);
    if (error) return Alert.alert('Дата рождения', error);
    savePerson({
      id: existing?.id ?? newId(),
      name: name.trim(),
      relation,
      birthday: {
        day: Number(birthday.day),
        month: birthday.month,
        year: birthday.year ? Number(birthday.year) : undefined,
      },
      notes: notes.trim() || undefined,
      professionHolidayIds: professions,
    });
    router.back();
  };

  const remove = () =>
    Alert.alert('Удалить?', `${existing?.name} и напоминания о нём будут удалены.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          deletePerson(existing!.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? existing.name : 'Новый человек' }} />
      <Field label="Имя" value={name} onChangeText={setName} placeholder="Например, Мама или Арман" />

      <Text style={styles.label}>Кто это</Text>
      <Chips
        options={RELATIONS.map((r) => ({ value: r, label: RELATION_LABELS[r] }))}
        value={relation}
        onChange={setRelation}
      />

      <DayMonthInput
        label="День рождения"
        value={birthday}
        onChange={setBirthday}
        yearHint="С годом напоминание покажет, сколько исполнится."
      />

      <Field
        label="Заметки"
        value={notes}
        onChangeText={setNotes}
        placeholder="Что любит, что уже дарили, идеи подарков…"
        multiline
      />

      <Text style={styles.label}>Профессиональные праздники</Text>
      <Muted>Отметьте, если человека нужно поздравить в профессиональный праздник.</Muted>
      <Chips
        options={PROFESSIONAL.map((h) => ({ value: h.id, label: h.name.replace(/^День /, '') }))}
        value={professions}
        onChange={(hid) =>
          setProfessions((list) => (list.includes(hid) ? list.filter((x) => x !== hid) : [...list, hid]))
        }
      />

      <Button title="Сохранить" onPress={save} />
      {existing ? <Button title="Удалить" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}
