import { Tabs } from 'expo-router/tabs';
import { Text } from 'react-native';
import { colors } from '../../ui/kit';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        tabBarActiveTintColor: colors.accent,
        tabBarStyle: { backgroundColor: colors.card },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Скоро', tabBarIcon: icon('🔔') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Календарь', tabBarIcon: icon('📆') }} />
      <Tabs.Screen name="people" options={{ title: 'Люди', tabBarIcon: icon('👨‍👩‍👧') }} />
      <Tabs.Screen name="holidays" options={{ title: 'Праздники', tabBarIcon: icon('🇰🇿') }} />
      <Tabs.Screen name="settings" options={{ title: 'Настройки', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
