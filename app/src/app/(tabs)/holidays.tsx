import { Switch, Text, View } from 'react-native';
import { dateToKey, daysBetween, formatKey, parseKey, resolveRule } from '../../core/dates';
import { isHolidayEnabled } from '../../core/occasions';
import { HOLIDAY_KIND_LABELS, type Holiday, type HolidayKind } from '../../core/types';
import { HOLIDAYS_KZ } from '../../data/holidaysKz';
import { useStore } from '../../state/store';
import { Card, Muted, Row, Screen, SectionTitle, colors, styles } from '../../ui/kit';

const KINDS: HolidayKind[] = ['state', 'religious', 'other', 'professional'];

function nextDate(holiday: Holiday, today: string): string | null {
  const year = parseKey(today).year;
  for (const y of [year, year + 1]) {
    const date = resolveRule(holiday.rule, y);
    if (date && daysBetween(today, date) >= 0) return date;
  }
  return null;
}

export default function HolidaysScreen() {
  const { data, setHolidayEnabled } = useStore();
  const today = dateToKey(new Date());

  return (
    <Screen>
      <Muted>
        Включите праздники, о которых нужно напоминать. Профессиональный праздник включается сам, если отметить его у
        человека в карточке (например, «День учителя» у сестры-учительницы).
      </Muted>
      {KINDS.map((kind) => (
        <Card key={kind} style={{ marginTop: 12 }}>
          <SectionTitle>{HOLIDAY_KIND_LABELS[kind]}</SectionTitle>
          {HOLIDAYS_KZ.filter((h) => h.kind === kind).map((h) => {
            const date = nextDate(h, today);
            const linked = data.people.filter((p) => p.professionHolidayIds.includes(h.id)).map((p) => p.name);
            return (
              <Row key={h.id}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.body}>
                    {h.name}
                    {h.dayOff ? ' · выходной' : ''}
                  </Text>
                  <Muted>
                    {date ? formatKey(date) : 'дата пока не известна'}
                    {h.note ? ` · ${h.note}` : ''}
                    {linked.length > 0 ? ` · ${linked.join(', ')}` : ''}
                  </Muted>
                </View>
                <Switch
                  value={isHolidayEnabled(h, data)}
                  onValueChange={(v) => setHolidayEnabled(h.id, v)}
                  trackColor={{ true: colors.accent }}
                  thumbColor="#fff"
                />
              </Row>
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}
