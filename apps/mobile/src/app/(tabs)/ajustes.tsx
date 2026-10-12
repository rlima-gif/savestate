import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameRepository } from '../../db/repositories/game-repo';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import { DeviceRepository } from '../../db/repositories/device-repo';
import { BackupService } from '../../services/backup';
import { colors } from '../../theme/colors';

export default function AjustesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = 80 + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);
  const [stats, setStats] = useState({
    totalGames: 0,
    playing: 0,
    beaten: 0,
    completed: 0,
    backlog: 0,
    totalMinutes: 0,
    devicesCount: 0,
  });

  const loadStats = useCallback(() => {
    const games = GameRepository.getAll();
    const pts = PlaythroughRepository.getAll();
    const devices = DeviceRepository.getAll();

    let playing = 0;
    let beaten = 0;
    let completed = 0;
    let backlog = 0;
    let totalMinutes = 0;

    for (const pt of pts) {
      if (pt.status === 'playing') playing++;
      if (pt.status === 'beaten') beaten++;
      if (pt.status === 'completed') completed++;
      if (pt.status === 'backlog') backlog++;
      totalMinutes += pt.totalPlaytimeMinutes || 0;
    }

    setStats({
      totalGames: games.length,
      playing,
      beaten,
      completed,
      backlog,
      totalMinutes,
      devicesCount: devices.length,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleExportJson = async () => {
    try {
      const json = BackupService.createFullBackupJson();
      const dateStr = new Date().toISOString().slice(0, 10);
      await BackupService.shareBackupFile(`savestate-backup-${dateStr}.json`, json, 'application/json');
    } catch (err: any) {
      Alert.alert('Erro ao exportar', err.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = BackupService.createCsvExport();
      const dateStr = new Date().toISOString().slice(0, 10);
      await BackupService.shareBackupFile(`savestate-games-${dateStr}.csv`, csv, 'text/csv');
    } catch (err: any) {
      Alert.alert('Erro ao exportar', err.message);
    }
  };

  const totalHours = Math.floor(stats.totalMinutes / 60);
  const remainingMins = stats.totalMinutes % 60;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Estatísticas da Jogatina</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalGames}</Text>
            <Text style={styles.statLabel}>Jogos Registrados</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.dark.primary }]}>{stats.playing}</Text>
            <Text style={styles.statLabel}>Em Andamento</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.dark.success }]}>
              {stats.beaten + stats.completed}
            </Text>
            <Text style={styles.statLabel}>Zerados / 100%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.dark.accent }]}>
              {totalHours}h {remainingMins}m
            </Text>
            <Text style={styles.statLabel}>Tempo Total Jogado</Text>
          </View>
        </View>
      </View>

      {/* Backup and Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Importação & Backup</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/modal/sync-integrations')}
        >
          <Ionicons name="sync-outline" size={22} color={colors.dark.primary} />
          <View style={styles.menuItemTextContainer}>
            <Text style={styles.menuItemTitle}>Sincronizar Steam & RetroAchievements</Text>
            <Text style={styles.menuItemSub}>Importe horas jogadas e jogos de perfis públicos</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleExportJson}>
          <Ionicons name="cloud-download-outline" size={22} color={colors.dark.accent} />
          <View style={styles.menuItemTextContainer}>
            <Text style={styles.menuItemTitle}>Exportar Backup Completo (JSON)</Text>
            <Text style={styles.menuItemSub}>Salva biblioteca, saves, notas, checklists e dispositivos</Text>
          </View>
          <Ionicons name="share-outline" size={18} color={colors.dark.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleExportCsv}>
          <Ionicons name="document-text-outline" size={22} color={colors.dark.success} />
          <View style={styles.menuItemTextContainer}>
            <Text style={styles.menuItemTitle}>Exportar Planilha (CSV / Excel)</Text>
            <Text style={styles.menuItemSub}>Planilha estruturada com UTF-8 BOM e dados de progresso</Text>
          </View>
          <Ionicons name="share-outline" size={18} color={colors.dark.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Devices Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Hardware & Dispositivos</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/modal/device-edit')}
        >
          <Ionicons name="hardware-chip-outline" size={22} color={colors.dark.primary} />
          <View style={styles.menuItemTextContainer}>
            <Text style={styles.menuItemTitle}>Meus Dispositivos ({stats.devicesCount})</Text>
            <Text style={styles.menuItemSub}>
              Configurações gráficas, emuladores, Steam Deck, Legion Go, mods
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
        </TouchableOpacity>
      </View>

      {/* App Info & About */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Sobre o Aplicativo</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Aplicativo:</Text>
            <Text style={styles.infoValue}>SaveState — Backlog & Assistente Gamer</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versão:</Text>
            <Text style={styles.infoValue}>0.1.0 (Build 1)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID do Pacote:</Text>
            <Text style={styles.infoValue}>com.savestate.app</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Armazenamento:</Text>
            <Text style={styles.infoValue}>SQLite Local (Offline-First)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Motor de IA:</Text>
            <Text style={styles.infoValue}>Google Gemini (Vision & Text) via Cloudflare</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
  },
  statNumber: {
    color: colors.dark.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 12,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: '700',
  },
  menuItemSub: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    color: colors.dark.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});
