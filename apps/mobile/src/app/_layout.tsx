import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { getDatabase } from '../db/client';
import { colors } from '../theme/colors';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    try {
      getDatabase();
      setDbReady(true);
    } catch (e: any) {
      console.error('Failed to init SQLite:', e);
      setDbError(e.message);
    }
  }, []);

  if (dbError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Erro ao inicializar banco local</Text>
        <Text style={styles.errorSub}>{dbError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
        <Text style={styles.loadingText}>Carregando SaveState...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.dark.background} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.dark.background },
          headerTintColor: colors.dark.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.dark.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="game/[id]"
          options={{ title: 'Detalhes do Jogo', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="playthrough/[id]"
          options={{ title: 'Campanha', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen
          name="modal/add-game"
          options={{ presentation: 'modal', title: 'Adicionar Jogo' }}
        />
        <Stack.Screen
          name="modal/session-edit"
          options={{ presentation: 'modal', title: 'Registrar Tempo' }}
        />
        <Stack.Screen
          name="modal/device-edit"
          options={{ presentation: 'modal', title: 'Configurar Dispositivo' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: colors.dark.textSecondary,
    fontSize: 16,
  },
  errorTitle: {
    color: colors.dark.danger,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSub: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
