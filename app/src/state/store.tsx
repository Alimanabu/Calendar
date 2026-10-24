import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type AppData, type CustomEvent, type Person, type Settings } from '../core/types';
import { syncReminders } from '../services/notifications';

const STORAGE_KEY = 'calendar-data-v1';

const EMPTY: AppData = { people: [], events: [], settings: DEFAULT_SETTINGS };

interface Store {
  data: AppData;
  ready: boolean;
  savePerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  saveEvent: (event: CustomEvent) => void;
  deleteEvent: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setHolidayEnabled: (holidayId: string, enabled: boolean) => void;
}

const StoreContext = createContext<Store | null>(null);

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Дополняем сохранённые данные новыми полями настроек, если приложение обновилось. */
function hydrate(raw: Partial<AppData>): AppData {
  const s: Partial<Settings> = raw.settings ?? {};
  return {
    people: raw.people ?? [],
    events: raw.events ?? [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...s,
      leadDays: { ...DEFAULT_SETTINGS.leadDays, ...s.leadDays },
      holidayLeadDays: { ...DEFAULT_SETTINGS.holidayLeadDays, ...s.holidayLeadDays },
      holidayOverrides: { ...s.holidayOverrides },
    },
  };
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) setData(hydrate(JSON.parse(json)));
      })
      .catch((err) => console.warn('Не удалось прочитать данные', err))
      .finally(() => setReady(true));
  }, []);

  // Сохраняем и перепланируем уведомления после каждого изменения (и при запуске —
  // это сдвигает «окно» из 60 ближайших напоминаний вперёд).
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((err) => console.warn('Не удалось сохранить', err));
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncReminders(data).catch((err) => console.warn('Не удалось запланировать напоминания', err));
    }, 500);
  }, [data, ready]);

  const savePerson = useCallback((person: Person) => setData((d) => ({ ...d, people: upsert(d.people, person) })), []);
  const deletePerson = useCallback(
    (id: string) =>
      setData((d) => ({
        ...d,
        people: d.people.filter((p) => p.id !== id),
        events: d.events.map((e) => (e.personId === id ? { ...e, personId: undefined } : e)),
      })),
    [],
  );
  const saveEvent = useCallback(
    (event: CustomEvent) => setData((d) => ({ ...d, events: upsert(d.events, event) })),
    [],
  );
  const deleteEvent = useCallback(
    (id: string) => setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) })),
    [],
  );
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    [],
  );
  const setHolidayEnabled = useCallback(
    (holidayId: string, enabled: boolean) =>
      setData((d) => ({
        ...d,
        settings: { ...d.settings, holidayOverrides: { ...d.settings.holidayOverrides, [holidayId]: enabled } },
      })),
    [],
  );

  const store = useMemo(
    () => ({ data, ready, savePerson, deletePerson, saveEvent, deleteEvent, updateSettings, setHolidayEnabled }),
    [data, ready, savePerson, deletePerson, saveEvent, deleteEvent, updateSettings, setHolidayEnabled],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore вне StoreProvider');
  return store;
}
