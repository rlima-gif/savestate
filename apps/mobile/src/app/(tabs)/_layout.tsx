import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Safe padding for both 3-button navigation (high inset) and gesture navigation
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.dark.tabBarActive,
        tabBarInactiveTintColor: colors.dark.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.dark.tabBarBg,
          borderTopColor: colors.dark.border,
          borderTopWidth: 1,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.dark.background,
          borderBottomColor: colors.dark.border,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.dark.text,
        headerTitleStyle: {
          color: colors.dark.text,
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Biblioteca',
          headerTitle: 'Minha Biblioteca',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jogando"
        options={{
          title: 'Jogando',
          headerTitle: 'Continuar Jogando',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="descobrir"
        options={{
          title: 'Descobrir',
          headerTitle: 'Explorar & Catálogo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistente"
        options={{
          title: 'Assistente',
          headerTitle: 'Assistente Gamer IA',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          headerTitle: 'Ajustes & Dados',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-sharp" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
