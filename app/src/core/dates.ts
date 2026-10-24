import type { DateRule } from './types';

// Все даты — локальные календарные дни в формате YYYY-MM-DD, без часовых поясов.

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function dateToKey(d: Date): string {
  return toKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function parseKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

export function keyToDate(key: string, hour = 0): Date {
  const { year, month, day } = parseKey(key);
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

export function addDays(key: string, days: number): string {
  const { year, month, day } = parseKey(key);
  return dateToKey(new Date(year, month - 1, day + days));
}

/** Разница в календарных днях (b − a); устойчива к переходу на летнее время. */
export function daysBetween(a: string, b: string): number {
  const pa = parseKey(a);
  const pb = parseKey(b);
  return Math.round((Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86400000);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Ежегодная дата в заданном году; 29 февраля в невисокосный год — 28 февраля. */
export function annualDate(year: number, month: number, day: number): string {
  return toKey(year, month, Math.min(day, daysInMonth(year, month)));
}

export function resolveRule(rule: DateRule, year: number): string | null {
  switch (rule.type) {
    case 'fixed':
      return annualDate(year, rule.month, rule.day);
    case 'nthWeekday': {
      if (rule.n === -1) {
        const last = daysInMonth(year, rule.month);
        const lastWeekday = new Date(year, rule.month - 1, last).getDay();
        return toKey(year, rule.month, last - ((lastWeekday - rule.weekday + 7) % 7));
      }
      const firstWeekday = new Date(year, rule.month - 1, 1).getDay();
      const day = 1 + ((rule.weekday - firstWeekday + 7) % 7) + (rule.n - 1) * 7;
      return day <= daysInMonth(year, rule.month) ? toKey(year, rule.month, day) : null;
    }
    case 'table': {
      const md = rule.dates[year];
      return md ? `${year}-${md}` : null;
    }
  }
}

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export const MONTHS_NOMINATIVE = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

/** «24 ноября» */
export function formatDayMonth(month: number, day: number): string {
  return `${day} ${MONTHS_GENITIVE[month - 1]}`;
}

/** «24 ноября, вторник» */
export function formatKey(key: string): string {
  const { month, day } = parseKey(key);
  return `${formatDayMonth(month, day)}, ${WEEKDAYS[keyToDate(key).getDay()]}`;
}

export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** «сегодня», «завтра», «через 3 дня», «через месяц» */
export function formatDaysLeft(days: number): string {
  if (days === 0) return 'сегодня';
  if (days === 1) return 'завтра';
  if (days === 2) return 'послезавтра';
  if (days === 7) return 'через неделю';
  if (days === 14) return 'через две недели';
  if (days >= 28 && days <= 31) return 'через месяц';
  return `через ${days} ${plural(days, ['день', 'дня', 'дней'])}`;
}

export function formatAge(age: number): string {
  return `${age} ${plural(age, ['год', 'года', 'лет'])}`;
}
