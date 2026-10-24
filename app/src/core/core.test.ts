import { describe, expect, it } from 'vitest';
import { HOLIDAYS_KZ } from '../data/holidaysKz';
import { addDays, daysBetween, formatDaysLeft, resolveRule } from './dates';
import { buildOccasions, findOccasion, isHolidayEnabled } from './occasions';
import { planReminders } from './reminders';
import { DEFAULT_SETTINGS, type AppData, type Person } from './types';

const mom: Person = {
  id: 'p1',
  name: 'Мама',
  relation: 'family',
  birthday: { day: 24, month: 11, year: 1971 },
  professionHolidayIds: ['prof-teacher'],
};
const friend: Person = {
  id: 'p2',
  name: 'Арман',
  relation: 'friend',
  birthday: { day: 29, month: 2 },
  professionHolidayIds: [],
};

const data = (overrides: Partial<AppData> = {}): AppData => ({
  people: [mom, friend],
  events: [],
  settings: DEFAULT_SETTINGS,
  ...overrides,
});

const holiday = (id: string) => HOLIDAYS_KZ.find((h) => h.id === id)!;

describe('dates', () => {
  it('resolves nth-weekday rules', () => {
    // Третье воскресенье июня 2026 — 21 июня.
    expect(resolveRule({ type: 'nthWeekday', month: 6, weekday: 0, n: 3 }, 2026)).toBe('2026-06-21');
    // Последнее воскресенье сентября 2026 — 27 сентября.
    expect(resolveRule({ type: 'nthWeekday', month: 9, weekday: 0, n: -1 }, 2026)).toBe('2026-09-27');
    // Пятого понедельника в феврале 2026 нет.
    expect(resolveRule({ type: 'nthWeekday', month: 2, weekday: 1, n: 5 }, 2026)).toBeNull();
  });

  it('handles lunar tables and missing years', () => {
    expect(resolveRule(holiday('kurban-ait').rule, 2026)).toBe('2026-05-27');
    expect(resolveRule(holiday('kurban-ait').rule, 2040)).toBeNull();
  });

  it('counts calendar days across year boundaries', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('formats days left in Russian', () => {
    expect(formatDaysLeft(0)).toBe('сегодня');
    expect(formatDaysLeft(1)).toBe('завтра');
    expect(formatDaysLeft(3)).toBe('через 3 дня');
    expect(formatDaysLeft(5)).toBe('через 5 дней');
    expect(formatDaysLeft(21)).toBe('через 21 день');
    expect(formatDaysLeft(30)).toBe('через месяц');
  });
});

describe('occasions', () => {
  it('moves Feb 29 birthdays to Feb 28 in non-leap years and computes age', () => {
    const occ = buildOccasions(data(), [], '2027-01-01', '2028-12-31').filter((o) => o.kind === 'birthday');
    expect(occ.map((o) => o.date)).toEqual(['2027-02-28', '2027-11-24', '2028-02-29', '2028-11-24']);
    expect(occ[1].turningAge).toBe(56);
    expect(occ[0].turningAge).toBeUndefined();
  });

  it('enables professional holidays only when someone is linked or turned on manually', () => {
    expect(isHolidayEnabled(holiday('prof-teacher'), data())).toBe(true);
    expect(isHolidayEnabled(holiday('prof-medical'), data())).toBe(false);
    expect(isHolidayEnabled(holiday('republic-day'), data())).toBe(true);
    const custom = data({
      settings: { ...DEFAULT_SETTINGS, holidayOverrides: { 'prof-medical': true, 'republic-day': false } },
    });
    expect(isHolidayEnabled(holiday('prof-medical'), custom)).toBe(true);
    expect(isHolidayEnabled(holiday('republic-day'), custom)).toBe(false);
  });

  it('links people to their professional holiday', () => {
    const [teacherDay] = buildOccasions(data(), HOLIDAYS_KZ, '2026-10-05', '2026-10-05');
    expect(teacherDay.title).toBe('День учителя');
    expect(teacherDay.personIds).toEqual(['p1']);
  });

  it('finds an occasion by id, even for a disabled holiday', () => {
    expect(findOccasion(data(), HOLIDAYS_KZ, 'birthday:p1:2026-11-24')?.title).toBe('День рождения: Мама');
    expect(findOccasion(data(), HOLIDAYS_KZ, 'holiday:prof-medical:2026-06-21')?.title).toBe(
      'День медицинского работника',
    );
    expect(findOccasion(data(), HOLIDAYS_KZ, 'birthday:p1:2026-11-25')).toBeUndefined();
    expect(findOccasion(data(), HOLIDAYS_KZ, 'garbage')).toBeUndefined();
  });
});

describe('planReminders', () => {
  // 24 октября 2026, 12:00 — напоминание на 10:00 сегодня уже прошло.
  const now = new Date(2026, 9, 24, 12, 0);

  it('reminds family a month, a week and a day ahead', () => {
    const reminders = planReminders(data({ people: [mom] }), [], now);
    expect(reminders.map((r) => [r.daysBefore, r.fireAt.toDateString()])).toEqual([
      [30, new Date(2026, 9, 25).toDateString()],
      [7, new Date(2026, 10, 17).toDateString()],
      [1, new Date(2026, 10, 23).toDateString()],
      [0, new Date(2026, 10, 24).toDateString()],
      [30, new Date(2027, 9, 25).toDateString()],
      [7, new Date(2027, 10, 17).toDateString()],
      [1, new Date(2027, 10, 23).toDateString()],
      [0, new Date(2027, 10, 24).toDateString()],
    ]);
    expect(reminders[0].fireAt.getHours()).toBe(10);
    expect(reminders[0].title).toBe('🎂 Через месяц день рождения: Мама');
    expect(reminders[0].body).toContain('24 ноября, вторник, исполнится 55 лет');
  });

  it('reminds friends only a week ahead and skips past reminders', () => {
    const reminders = planReminders(data({ people: [friend] }), [], now);
    expect(reminders.map((r) => r.daysBefore)).toEqual([7, 1, 0]);
    expect(reminders[0].fireAt.toDateString()).toBe(new Date(2027, 1, 21).toDateString());
  });

  it('names linked people in holiday reminders', () => {
    const reminders = planReminders(data(), HOLIDAYS_KZ, now);
    const teacher = reminders.find((r) => r.occasionId === 'holiday:prof-teacher:2027-10-05' && r.daysBefore === 1);
    expect(teacher?.title).toBe('🎉 Завтра: День учителя');
    expect(teacher?.body).toBe('5 октября, вторник. Поздравьте: Мама. Откройте, чтобы получить идеи поздравления.');
    const republic = reminders.find((r) => r.occasionId === 'holiday:republic-day:2026-10-25');
    expect(republic?.title).toBe('🎉 Сегодня: День Республики');
  });

  it('respects the limit and stays sorted', () => {
    const reminders = planReminders(data(), HOLIDAYS_KZ, now, { limit: 10 });
    expect(reminders).toHaveLength(10);
    const times = reminders.map((r) => r.fireAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(reminders.map((r) => r.id)).size).toBe(10);
  });
});
