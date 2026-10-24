import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MONTHS_NOMINATIVE, WEEKDAYS_SHORT, dateToKey, daysInMonth, formatKey, toKey } from '../../core/dates';
import { buildOccasions } from '../../core/occasions';
import type { Occasion } from '../../core/types';
import { HOLIDAYS_KZ } from '../../data/holidaysKz';
import { useStore } from '../../state/store';
import { Card, Muted, Screen, SectionTitle, colors, kindColors, styles as kit } from '../../ui/kit';
import { OccasionRow } from '../../ui/OccasionRow';

export default function CalendarScreen() {
  const { data } = useStore();
  const today = dateToKey(new Date());
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selected, setSelected] = useState(today);

  const { year, month } = cursor;
  const total = daysInMonth(year, month);
  const occasions = buildOccasions(data, HOLIDAYS_KZ, toKey(year, month, 1), toKey(year, month, total));
  const byDay = new Map<string, Occasion[]>();
  for (const o of occasions) byDay.set(o.date, [...(byDay.get(o.date) ?? []), o]);

  // Неделя начинается с понедельника.
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  const selectedItems = byDay.get(selected) ?? [];

  return (
    <Screen>
      <Card>
        <View style={s.header}>
          <Pressable onPress={() => shift(-1)} hitSlop={12}>
            <Text style={s.arrow}>‹</Text>
          </Pressable>
          <Text style={kit.title}>
            {MONTHS_NOMINATIVE[month - 1]} {year}
          </Text>
          <Pressable onPress={() => shift(1)} hitSlop={12}>
            <Text style={s.arrow}>›</Text>
          </Pressable>
        </View>
        <View style={s.grid}>
          {WEEKDAYS_SHORT.map((w) => (
            <Text key={w} style={[s.cell, s.weekday]}>
              {w}
            </Text>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <View key={`e${i}`} style={s.cell} />;
            const key = toKey(year, month, day);
            const items = byDay.get(key) ?? [];
            const isSelected = key === selected;
            return (
              <Pressable key={key} style={s.cell} onPress={() => setSelected(key)}>
                <View style={[s.day, key === today && s.today, isSelected && s.selected]}>
                  <Text style={[s.dayText, isSelected && { color: '#fff', fontWeight: '700' }]}>{day}</Text>
                </View>
                <View style={s.dots}>
                  {items.slice(0, 3).map((o) => (
                    <View key={o.id} style={[s.dot, { backgroundColor: kindColors[o.holidayKind ?? o.kind] }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <SectionTitle>{formatKey(selected)}</SectionTitle>
        {selectedItems.length === 0 ? (
          <Muted>В этот день ничего нет.</Muted>
        ) : (
          selectedItems.map((o) => <OccasionRow key={o.id} occasion={o} data={data} today={today} />)
        )}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  arrow: { fontSize: 28, color: colors.accent, paddingHorizontal: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, minHeight: 46 },
  weekday: { fontSize: 12, color: colors.muted, fontWeight: '600', minHeight: 20 },
  day: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.accent },
  selected: { backgroundColor: colors.accent },
  dayText: { fontSize: 15, color: colors.text },
  dots: { flexDirection: 'row', gap: 3, marginTop: 2, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
