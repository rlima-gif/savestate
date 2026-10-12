import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.dark.tabBarActive,
        tabBarInactiveTintColor: colors.dark.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.dark.tabBarBg,
          borderTopColor: colors.dark.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: colors.dark.background,
          borderBottomColor: colors.dark.border,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: colors.dark.text,
          fontWeight: '700',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Biblioteca',
          headerTitle: 'Minha Biblioteca',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jogando"
        options={{
          title: 'Jogando',
          headerTitle: 'Continuar Jogando',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="descobrir"
        options={{
          title: 'Descobrir',
          headerTitle: 'Explorar & Recomendações',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistente"
        options={{
          title: 'Assistente',
          headerTitle: 'SaveState Assistente Gamer',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          headerTitle: 'Ajustes & Dados',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
