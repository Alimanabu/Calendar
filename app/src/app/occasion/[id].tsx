import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import { dateToKey, daysBetween, formatAge, formatDaysLeft, formatKey } from '../../core/dates';
import { findOccasion } from '../../core/occasions';
import { HOLIDAY_KIND_LABELS, RELATION_LABELS, type AppData, type Occasion } from '../../core/types';
import { HOLIDAYS_KZ } from '../../data/holidaysKz';
import {
  buildIdeasRequest,
  fetchIdeas,
  ideasConfigured,
  loadCachedIdeas,
  saveCachedIdeas,
  type CachedIdeas,
} from '../../services/ideasApi';
import { useStore } from '../../state/store';
import { Badge, Button, Card, Muted, Row, Screen, SectionTitle, colors, styles } from '../../ui/kit';

export default function OccasionScreen() {
  const { id, auto } = useLocalSearchParams<{ id: string; auto?: string }>();
  const { data, ready } = useStore();
  if (!ready) return null;
  const occasion = findOccasion(data, HOLIDAYS_KZ, id);
  if (!occasion) {
    return (
      <Screen>
        <Muted>Этот повод больше не найден — возможно, человека или дату удалили.</Muted>
      </Screen>
    );
  }
  return <OccasionDetails occasion={occasion} data={data} autoLoad={auto === '1'} />;
}

function OccasionDetails({ occasion, data, autoLoad }: { occasion: Occasion; data: AppData; autoLoad: boolean }) {
  const today = dateToKey(new Date());
  const days = daysBetween(today, occasion.date);
  const holiday = HOLIDAYS_KZ.find((h) => occasion.kind === 'holiday' && h.id === occasion.sourceId);
  const people = occasion.personIds.map((pid) => data.people.find((p) => p.id === pid)).filter((p) => p !== undefined);

  const [cached, setCached] = useState<CachedIdeas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Запрос строим по свежим данным (интересы могли поправить), но сам generate не пересоздаём.
  const latest = useRef({ occasion, data, today });
  latest.current = { occasion, data, today };

  const generate = useCallback(async (exclude: string[] = []) => {
    const { occasion: occ, data: d, today: t } = latest.current;
    setLoading(true);
    setError(null);
    try {
      const ideas = await fetchIdeas(buildIdeasRequest(occ, d, HOLIDAYS_KZ, t, exclude));
      setCached(await saveCachedIdeas(occ.id, ideas));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCachedIdeas(occasion.id).then((c) => {
      if (cancelled) return;
      if (c) setCached(c);
      // Открыли из уведомления — сразу просим идеи, чтобы не нажимать лишний раз.
      else if (autoLoad && ideasConfigured) generate();
    });
    return () => {
      cancelled = true;
    };
  }, [occasion.id, autoLoad, generate]);

  const ideas = cached?.ideas;

  return (
    <Screen>
      <Stack.Screen options={{ title: occasion.kind === 'birthday' ? 'День рождения' : 'Повод' }} />
      <Card>
        <Text style={[styles.title, { fontSize: 22, marginBottom: 6 }]}>{occasion.title}</Text>
        <Muted>
          {formatKey(occasion.date)}
          {occasion.turningAge ? ` · ${formatAge(occasion.turningAge)}` : ''}
        </Muted>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge label={formatDaysLeft(days)} color={colors.accent} />
          {holiday ? <Badge label={HOLIDAY_KIND_LABELS[holiday.kind]} color={colors.muted} /> : null}
          {holiday?.dayOff ? <Badge label="выходной" color={colors.muted} /> : null}
        </View>
        {holiday?.note ? <Text style={[styles.muted, { marginTop: 8 }]}>{holiday.note}</Text> : null}
      </Card>

      {people.length > 0 ? (
        <Card>
          <SectionTitle>Кого поздравить</SectionTitle>
          {people.map((p) => (
            <Row key={p.id} onPress={() => router.push({ pathname: '/person/[id]', params: { id: p.id } })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.body}>{p.name}</Text>
                <Muted>
                  {RELATION_LABELS[p.relation]}
                  {p.interests ? ` · ${p.interests}` : ''}
                </Muted>
              </View>
              <Text style={{ color: colors.muted }}>›</Text>
            </Row>
          ))}
        </Card>
      ) : null}

      {!ideas || loading || error ? (
        <Card>
          <SectionTitle>✨ Идеи от Claude</SectionTitle>
          {!ideasConfigured ? (
            <Muted>
              Сервер идей не настроен. Задайте EXPO_PUBLIC_API_URL и EXPO_PUBLIC_APP_TOKEN — инструкция в README.
            </Muted>
          ) : !ideas && !loading ? (
            <>
              <Muted>
                Claude предложит подарки с примерными ценами и напишет несколько вариантов поздравления
                {people.length > 0 ? ' с учётом интересов и заметок о человеке' : ''}.
              </Muted>
              <Button title="Получить идеи" onPress={() => generate()} />
            </>
          ) : null}
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <ActivityIndicator color={colors.accent} />
              <Muted>Claude подбирает идеи, обычно это 10–30 секунд…</Muted>
            </View>
          ) : null}
          {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}
        </Card>
      ) : null}

      {ideas && !loading ? (
        <>
          <Card>
            <SectionTitle>🎁 Идеи подарков от Claude</SectionTitle>
            {ideas.gifts.map((g, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <Text style={styles.title}>{g.title}</Text>
                <Text style={styles.body}>{g.why}</Text>
                <Text style={[styles.muted, { marginTop: 2 }]}>💰 {g.priceRange}</Text>
              </View>
            ))}
          </Card>

          <Card>
            <SectionTitle>💬 Поздравления</SectionTitle>
            <Muted>Нажмите на текст, чтобы отправить его в WhatsApp, Telegram и т.д.</Muted>
            {ideas.greetings.map((g, i) => (
              <Pressable
                key={i}
                onPress={() => Share.share({ message: g.text })}
                style={({ pressed }) => [
                  { backgroundColor: colors.accentSoft, borderRadius: 12, padding: 12, marginTop: 10 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.hint, { marginTop: 0, marginBottom: 4, textTransform: 'uppercase' }]}>
                  {g.style}
                  {g.language ? ` · ${g.language === 'kk' ? 'қазақша' : 'по-русски'}` : ''}
                </Text>
                <Text style={styles.body}>{g.text}</Text>
              </Pressable>
            ))}
          </Card>

          {ideas.tips.length > 0 ? (
            <Card>
              <SectionTitle>📝 Советы</SectionTitle>
              {ideas.tips.map((t, i) => (
                <Text key={i} style={[styles.body, { marginBottom: 6 }]}>
                  • {t}
                </Text>
              ))}
            </Card>
          ) : null}

          <Button title="Ещё идеи" variant="secondary" onPress={() => generate(ideas.gifts.map((g) => g.title))} />
        </>
      ) : null}
    </Screen>
  );
}
