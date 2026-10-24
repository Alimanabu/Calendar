/** Насколько близок человек — от этого зависит, за сколько дней напоминать. */
export type Relation = 'family' | 'close' | 'friend' | 'colleague' | 'other';

export const RELATIONS: Relation[] = ['family', 'close', 'friend', 'colleague', 'other'];

export const RELATION_LABELS: Record<Relation, string> = {
  family: 'Семья',
  close: 'Близкие друзья',
  friend: 'Друзья',
  colleague: 'Коллеги',
  other: 'Знакомые',
};

/** День и месяц (1–12); год необязателен — без него не считаем возраст. */
export interface DayMonth {
  day: number;
  month: number;
  year?: number;
}

export interface Person {
  id: string;
  name: string;
  relation: Relation;
  birthday: DayMonth;
  notes?: string;
  /** Профессиональные праздники, в которые этого человека нужно поздравить. */
  professionHolidayIds: string[];
}

/** Произвольная ежегодная дата: годовщина свадьбы, день памяти и т.п. */
export interface CustomEvent {
  id: string;
  title: string;
  date: DayMonth;
  relation: Relation;
  personId?: string;
  notes?: string;
}

export type HolidayKind = 'state' | 'religious' | 'professional' | 'other';

export const HOLIDAY_KIND_LABELS: Record<HolidayKind, string> = {
  state: 'Государственные',
  religious: 'Религиозные',
  professional: 'Профессиональные',
  other: 'Другие праздники',
};

export type DateRule =
  | { type: 'fixed'; month: number; day: number }
  /** n-й день недели месяца; weekday: 0 — воскресенье; n = -1 — последний. */
  | { type: 'nthWeekday'; month: number; weekday: number; n: number }
  /** Даты по лунному календарю, известные заранее: { 2026: '05-27' }. */
  | { type: 'table'; dates: Record<number, string> };

export interface Holiday {
  id: string;
  name: string;
  kind: HolidayKind;
  rule: DateRule;
  /** Выходной день в Казахстане. */
  dayOff?: boolean;
  /** Для профессиональных: кого поздравляем («учителя», «медики»). */
  profession?: string;
  note?: string;
}

export interface Settings {
  /** За сколько дней напоминать о днях рождения и датах, по близости. 0 — в сам день. */
  leadDays: Record<Relation, number[]>;
  holidayLeadDays: Record<HolidayKind, number[]>;
  /** Час, в который приходят напоминания (0–23). */
  notifyHour: number;
  /** Ручные включения/выключения праздников поверх значений по умолчанию. */
  holidayOverrides: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: Settings = {
  leadDays: {
    family: [30, 7, 1, 0],
    close: [14, 3, 0],
    friend: [7, 1, 0],
    colleague: [3, 0],
    other: [0],
  },
  holidayLeadDays: {
    state: [7, 0],
    religious: [7, 0],
    professional: [1, 0],
    other: [3, 0],
  },
  notifyHour: 10,
  holidayOverrides: {},
};

export interface AppData {
  people: Person[];
  events: CustomEvent[];
  settings: Settings;
}

export type OccasionKind = 'birthday' | 'holiday' | 'event';

/** Конкретное событие в конкретный день: «ДР мамы 24.11.2026», «День учителя 05.10.2026». */
export interface Occasion {
  /** `${kind}:${sourceId}:${YYYY-MM-DD}` */
  id: string;
  kind: OccasionKind;
  sourceId: string;
  date: string;
  title: string;
  /** Кого поздравлять. */
  personIds: string[];
  /** Определяет, за сколько дней напоминать. */
  relation?: Relation;
  holidayKind?: HolidayKind;
  /** Сколько лет исполнится (если известен год рождения). */
  turningAge?: number;
}
