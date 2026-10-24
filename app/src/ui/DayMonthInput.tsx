import { Text, TextInput, View } from 'react-native';
import { Chips, styles } from './kit';

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export interface DayMonthDraft {
  day: string;
  month: number;
  year: string;
}

/** Ошибка ввода или null, если дата корректна. 29 февраля разрешено. */
export function validateDayMonth(d: DayMonthDraft): string | null {
  const day = Number(d.day);
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][d.month - 1];
  if (!Number.isInteger(day) || day < 1 || day > max) return `Укажите день от 1 до ${max}`;
  if (d.year) {
    const year = Number(d.year);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) return 'Проверьте год';
    if (d.month === 2 && day === 29 && !(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))) {
      return `В ${year} году не было 29 февраля`;
    }
  }
  return null;
}

export function DayMonthInput({
  label,
  value,
  onChange,
  yearHint,
}: {
  label: string;
  value: DayMonthDraft;
  onChange: (v: DayMonthDraft) => void;
  yearHint: string;
}) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <Chips
        options={MONTHS_SHORT.map((m, i) => ({ value: i + 1, label: m }))}
        value={value.month}
        onChange={(month) => onChange({ ...value, month })}
      />
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
        <View style={{ width: 90 }}>
          <Text style={styles.hint}>День</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="15"
            placeholderTextColor="#A8A096"
            value={value.day}
            onChangeText={(day) => onChange({ ...value, day: day.replace(/\D/g, '') })}
          />
        </View>
        <View style={{ width: 160 }}>
          <Text style={styles.hint}>Год (необязательно)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="1990"
            placeholderTextColor="#A8A096"
            value={value.year}
            onChangeText={(year) => onChange({ ...value, year: year.replace(/\D/g, '') })}
          />
        </View>
      </View>
      <Text style={[styles.hint, { marginBottom: 14 }]}>{yearHint}</Text>
    </View>
  );
}
