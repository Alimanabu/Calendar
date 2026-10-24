import { addDays, dateToKey, formatAge, formatDaysLeft, formatKey, keyToDate } from './dates';
import { buildOccasions } from './occasions';
import type { AppData, Holiday, Occasion } from './types';

export interface Reminder {
  /** Стабильный id: повод + за сколько дней. Нужен, чтобы не дублировать уведомления. */
  id: string;
  occasionId: string;
  fireAt: Date;
  daysBefore: number;
  title: string;
  body: string;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function leadDaysFor(occasion: Occasion, data: AppData): number[] {
  const { settings } = data;
  const days =
    occasion.kind === 'holiday'
      ? settings.holidayLeadDays[occasion.holidayKind ?? 'other']
      : settings.leadDays[occasion.relation ?? 'other'];
  return [...new Set(days)].filter((d) => d >= 0).sort((a, b) => b - a);
}

export function reminderText(occasion: Occasion, daysBefore: number, data: AppData): { title: string; body: string } {
  const when = capitalize(formatDaysLeft(daysBefore));
  const names = occasion.personIds
    .map((id) => data.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  const dateText = formatKey(occasion.date);

  if (occasion.kind === 'birthday') {
    const name = names[0] ?? '';
    const age = occasion.turningAge ? `, исполнится ${formatAge(occasion.turningAge)}` : '';
    return {
      title: `🎂 ${when} день рождения: ${name}`,
      body: `${daysBefore === 0 ? 'Сегодня' : dateText}${age}. Откройте — Claude подскажет идеи подарка и поздравления.`,
    };
  }

  const icon = occasion.kind === 'holiday' ? '🎉' : '📅';
  const who = names.length > 0 ? `Поздравьте: ${names.join(', ')}. ` : '';
  const years = occasion.turningAge ? ` (${formatAge(occasion.turningAge)})` : '';
  return {
    title: `${icon} ${when}: ${occasion.title}${years}`,
    body: `${daysBefore === 0 ? '' : `${dateText}. `}${who}Откройте, чтобы получить идеи поздравления.`,
  };
}

/**
 * Ближайшие напоминания. iOS хранит не больше 64 запланированных локальных уведомлений,
 * поэтому планируем только первые `limit` и пересчитываем при каждом открытии приложения.
 */
export function planReminders(
  data: AppData,
  holidays: Holiday[],
  now: Date,
  { horizonDays = 400, limit = 60 } = {},
): Reminder[] {
  const today = dateToKey(now);
  const reminders: Reminder[] = [];

  for (const occasion of buildOccasions(data, holidays, today, addDays(today, horizonDays))) {
    for (const daysBefore of leadDaysFor(occasion, data)) {
      const fireAt = keyToDate(addDays(occasion.date, -daysBefore), data.settings.notifyHour);
      if (fireAt.getTime() <= now.getTime()) continue;
      reminders.push({
        id: `${occasion.id}:-${daysBefore}`,
        occasionId: occasion.id,
        fireAt,
        daysBefore,
        ...reminderText(occasion, daysBefore, data),
      });
    }
  }

  return reminders.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, limit);
}
