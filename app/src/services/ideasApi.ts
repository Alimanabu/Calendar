import AsyncStorage from '@react-native-async-storage/async-storage';
import { daysBetween, dateToKey, parseKey } from '../core/dates';
import type { AppData, Holiday, Occasion, Relation } from '../core/types';

// Контракт с сервером — зеркало server/src/schema.ts.

export interface IdeasRequest {
  occasion: {
    kind: Occasion['kind'];
    title: string;
    date: string;
    daysLeft: number;
    holidayKind?: Holiday['kind'];
  };
  people: {
    name: string;
    relation: Relation;
    age?: number;
    gender?: 'male' | 'female';
    interests?: string;
    notes?: string;
    profession?: string;
  }[];
  budget?: string;
  language: 'ru' | 'kk' | 'both';
  exclude: string[];
}

export interface IdeasResponse {
  gifts: { title: string; why: string; priceRange: string }[];
  greetings: { style: string; language?: 'ru' | 'kk'; text: string }[];
  tips: string[];
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

export const ideasConfigured = Boolean(API_URL && APP_TOKEN);

const blank = (s?: string) => (s && s.trim() ? s.trim() : undefined);

export function buildIdeasRequest(
  occasion: Occasion,
  data: AppData,
  holidays: Holiday[],
  today: string,
  exclude: string[] = [],
): IdeasRequest {
  const holiday = occasion.kind === 'holiday' ? holidays.find((h) => h.id === occasion.sourceId) : undefined;
  const occasionYear = parseKey(occasion.date).year;
  const people = occasion.personIds
    .map((id) => data.people.find((p) => p.id === id))
    .filter((p) => p !== undefined)
    .map((p) => {
      const birthYear = p.birthday.year;
      const age = occasion.kind === 'birthday' ? occasion.turningAge : birthYear ? occasionYear - birthYear : undefined;
      return {
        name: p.name,
        relation: p.relation,
        age,
        gender: p.gender,
        interests: blank(p.interests),
        notes: blank(p.notes),
        profession: holiday?.profession,
      };
    });
  const event = occasion.kind === 'event' ? data.events.find((e) => e.id === occasion.sourceId) : undefined;
  const firstPerson =
    occasion.personIds.length === 1 ? data.people.find((p) => p.id === occasion.personIds[0]) : undefined;

  return {
    occasion: {
      kind: occasion.kind,
      title: event?.notes ? `${occasion.title} (${event.notes.trim()})` : occasion.title,
      date: occasion.date,
      daysLeft: Math.max(0, daysBetween(today, occasion.date)),
      holidayKind: occasion.holidayKind,
    },
    people,
    budget: blank(firstPerson?.budget),
    language: data.settings.greetingLanguage,
    exclude,
  };
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Сервер не принял токен приложения. Проверьте EXPO_PUBLIC_APP_TOKEN.',
  rate_limited: 'Лимит запросов на этот час исчерпан. Попробуйте позже.',
  refused: 'Claude не смог ответить на этот запрос. Попробуйте изменить заметки о человеке.',
  upstream_rate_limited: 'Сервис Claude сейчас перегружен. Попробуйте через минуту.',
};

export async function fetchIdeas(req: IdeasRequest): Promise<IdeasResponse> {
  if (!ideasConfigured) {
    throw new Error('Сервер идей не настроен: задайте EXPO_PUBLIC_API_URL и EXPO_PUBLIC_APP_TOKEN (см. README).');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL.replace(/\/$/, '')}/v1/ideas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${APP_TOKEN}` },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
  } catch {
    throw new Error('Нет связи с сервером идей. Проверьте интернет.');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const code = await res
      .json()
      .then((b: { error?: string }) => b.error ?? '')
      .catch(() => '');
    throw new Error(ERROR_MESSAGES[code] ?? `Сервер идей вернул ошибку ${res.status}.`);
  }
  return (await res.json()) as IdeasResponse;
}

// Кэш, чтобы повторное открытие повода не тратило запрос к Claude.

export interface CachedIdeas {
  ideas: IdeasResponse;
  createdAt: string;
}

const cacheKey = (occasionId: string) => `ideas:${occasionId}`;

export async function loadCachedIdeas(occasionId: string): Promise<CachedIdeas | null> {
  const json = await AsyncStorage.getItem(cacheKey(occasionId)).catch(() => null);
  return json ? (JSON.parse(json) as CachedIdeas) : null;
}

export async function saveCachedIdeas(occasionId: string, ideas: IdeasResponse): Promise<CachedIdeas> {
  const cached = { ideas, createdAt: dateToKey(new Date()) };
  await AsyncStorage.setItem(cacheKey(occasionId), JSON.stringify(cached)).catch(() => undefined);
  return cached;
}
