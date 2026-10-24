import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { daysBetween, formatAge, formatDaysLeft, formatKey } from '../core/dates';
import type { AppData, Occasion } from '../core/types';
import { Badge, Row, colors, kindColors, styles } from './kit';

const ICONS = { birthday: '🎂', event: '📅', holiday: '🎉' };

export function OccasionRow({ occasion, data, today }: { occasion: Occasion; data: AppData; today: string }) {
  const days = daysBetween(today, occasion.date);
  const names = occasion.personIds.map((id) => data.people.find((p) => p.id === id)?.name).filter(Boolean);
  const subtitle = [
    formatKey(occasion.date),
    occasion.turningAge ? formatAge(occasion.turningAge) : null,
    occasion.kind === 'holiday' && names.length > 0 ? `поздравить: ${names.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Row onPress={() => router.push({ pathname: '/occasion/[id]', params: { id: occasion.id } })}>
      <Text style={{ fontSize: 26 }}>{ICONS[occasion.kind]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{occasion.title}</Text>
        <Text style={[styles.muted, { fontSize: 13 }]}>{subtitle}</Text>
      </View>
      <Badge
        label={formatDaysLeft(days)}
        color={days <= 1 ? colors.accent : kindColors[occasion.holidayKind ?? occasion.kind]}
      />
    </Row>
  );
}
