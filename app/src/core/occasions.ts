import { addDays, annualDate, daysBetween, parseKey, resolveRule } from './dates';
import type { AppData, Holiday, Occasion, OccasionKind } from './types';

export function isHolidayEnabled(holiday: Holiday, data: AppData): boolean {
  const override = data.settings.holidayOverrides[holiday.id];
  if (override !== undefined) return override;
  if (holiday.kind !== 'professional') return true;
  // Профессиональный праздник включается сам, если к нему привязан кто-то из людей.
  return data.people.some((p) => p.professionHolidayIds.includes(holiday.id));
}

export function occasionId(kind: OccasionKind, sourceId: string, date: string): string {
  return `${kind}:${sourceId}:${date}`;
}

const KIND_ORDER: Record<OccasionKind, number> = { birthday: 0, event: 1, holiday: 2 };

/** Все поводы в диапазоне дат [from, to] включительно, по возрастанию даты. */
export function buildOccasions(
  data: AppData,
  holidays: Holiday[],
  from: string,
  to: string,
  { includeDisabled = false } = {},
): Occasion[] {
  const result: Occasion[] = [];
  const inRange = (key: string | null): key is string =>
    key !== null && daysBetween(from, key) >= 0 && daysBetween(key, to) >= 0;

  for (let year = parseKey(from).year; year <= parseKey(to).year; year++) {
    for (const person of data.people) {
      const { day, month, year: birthYear } = person.birthday;
      const date = annualDate(year, month, day);
      if (!inRange(date)) continue;
      result.push({
        id: occasionId('birthday', person.id, date),
        kind: 'birthday',
        sourceId: person.id,
        date,
        title: `День рождения: ${person.name}`,
        personIds: [person.id],
        relation: person.relation,
        turningAge: birthYear && birthYear < year ? year - birthYear : undefined,
      });
    }

    for (const event of data.events) {
      const date = annualDate(year, event.date.month, event.date.day);
      if (!inRange(date)) continue;
      const startYear = event.date.year;
      result.push({
        id: occasionId('event', event.id, date),
        kind: 'event',
        sourceId: event.id,
        date,
        title: event.title,
        personIds: event.personId ? [event.personId] : [],
        relation: event.relation,
        turningAge: startYear && startYear < year ? year - startYear : undefined,
      });
    }

    for (const holiday of holidays) {
      if (!includeDisabled && !isHolidayEnabled(holiday, data)) continue;
      const date = resolveRule(holiday.rule, year);
      if (!inRange(date)) continue;
      result.push({
        id: occasionId('holiday', holiday.id, date),
        kind: 'holiday',
        sourceId: holiday.id,
        date,
        title: holiday.name,
        personIds: data.people.filter((p) => p.professionHolidayIds.includes(holiday.id)).map((p) => p.id),
        holidayKind: holiday.kind,
      });
    }
  }

  return result.sort(
    (a, b) => daysBetween(b.date, a.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.title.localeCompare(b.title),
  );
}

/** Восстанавливает повод по id — например, при нажатии на уведомление. */
export function findOccasion(data: AppData, holidays: Holiday[], id: string): Occasion | undefined {
  const date = id.slice(id.lastIndexOf(':') + 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return buildOccasions(data, holidays, date, date, { includeDisabled: true }).find((o) => o.id === id);
}

export function upcomingOccasions(data: AppData, holidays: Holiday[], today: string, days: number): Occasion[] {
  return buildOccasions(data, holidays, today, addDays(today, days));
}
