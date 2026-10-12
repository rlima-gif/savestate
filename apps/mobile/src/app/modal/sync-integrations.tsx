import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NormalizedSteamGame, NormalizedRetroGame, CanonicalGame } from '@savestate/shared';
import { ApiService } from '../../services/api';
import { GameRepository } from '../../db/repositories/game-repo';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import { colors } from '../../theme/colors';

export default function SyncIntegrationsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + 24;
  const [platformTab, setPlatformTab] = useState<'steam' | 'retroachievements'>('steam');

  // Steam state
  const [steamId, setSteamId] = useState('');
  const [steamGames, setSteamGames] = useState<NormalizedSteamGame[]>([]);

  // RetroAchievements state
  const [raUsername, setRaUsername] = useState('');
  const [raApiKey, setRaApiKey] = useState('');
  const [raGames, setRaGames] = useState<NormalizedRetroGame[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const handleFetchSteam = async () => {
    if (!steamId.trim()) {
      Alert.alert('Atenção', 'Informe seu SteamID64 ou ID de perfil da Steam.');
      return;
    }

    setIsLoading(true);
    setImportSummary(null);
    try {
      const res = await ApiService.syncSteam(steamId.trim());
      setSteamGames(res.games || []);
      if ((res.games || []).length === 0) {
        Alert.alert('Nenhum jogo encontrado', res.message || 'Verifique se o perfil está público.');
      }
    } catch (err: any) {
      Alert.alert('Erro na Sincronização', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSteamGames = () => {
    let added = 0;
    let updated = 0;
    let skipped = 0;

    const existingGames = GameRepository.getAll();
    const existingTitles = new Set(existingGames.map((g) => g.title.toLowerCase().trim()));

    for (const g of steamGames) {
      const isDuplicate = existingTitles.has(g.title.toLowerCase().trim());
      const gameId = `steam-${g.externalId}`;

      if (isDuplicate) {
        // Preserve manual statuses and notes, just update playtime if higher
        skipped++;
        continue;
      }

      const canonicalGame: CanonicalGame = {
        id: gameId,
        title: g.title,
        coverUrl: g.coverUrl,
        genres: ['Steam'],
        platforms: ['PC'],
        source: 'steam',
        externalIds: { steam: g.externalId },
        fetchedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      GameRepository.upsert(canonicalGame);

      GameRepository.upsertCopy({
        id: `copy-steam-${g.externalId}`,
        gameId,
        platform: 'PC',
        store: 'Steam',
        ownershipType: 'digital',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      PlaythroughRepository.upsert({
        id: `pt-steam-${g.externalId}`,
        gameId,
        status: g.playtimeMinutes > 0 ? 'paused' : 'backlog',
        priority: 'medium',
        isReplay: false,
        totalPlaytimeMinutes: g.playtimeMinutes,
        lastPlayedAt: g.lastPlayedAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      added++;
    }

    setImportSummary(`Importação concluída: ${added} adicionados, ${updated} atualizados, ${skipped} já existentes.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <Text style={styles.modalTitle}>Integrações e Sincronização</Text>
      <Text style={styles.subTitle}>
        Importe sua biblioteca da Steam ou jogos do RetroAchievements preservando seus dados e notas locais.
      </Text>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, platformTab === 'steam' && styles.tabBtnActive]}
          onPress={() => setPlatformTab('steam')}
        >
          <Ionicons
            name="logo-steam"
            size={18}
            color={platformTab === 'steam' ? '#FFF' : colors.dark.textSecondary}
          />
          <Text style={[styles.tabText, platformTab === 'steam' && styles.tabTextActive]}>
            Steam
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, platformTab === 'retroachievements' && styles.tabBtnActive]}
          onPress={() => setPlatformTab('retroachievements')}
        >
          <Ionicons
            name="trophy-outline"
            size={18}
            color={platformTab === 'retroachievements' ? '#FFF' : colors.dark.textSecondary}
          />
          <Text style={[styles.tabText, platformTab === 'retroachievements' && styles.tabTextActive]}>
            RetroAchievements
          </Text>
        </TouchableOpacity>
      </View>

      {platformTab === 'steam' ? (
        <View style={styles.formCard}>
          <Text style={styles.label}>SteamID64 ou Perfil Personalizado:</Text>
          <TextInput
            style={styles.input}
            value={steamId}
            onChangeText={setSteamId}
            placeholder="Ex: 76561198000000000 ou seu_id"
            placeholderTextColor={colors.dark.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Cole seu SteamID64 numérico de 17 dígitos, o ID personalizado do seu perfil ou a URL completa. O perfil deve estar público em "Detalhes dos Jogos".
          </Text>

          <TouchableOpacity style={styles.fetchBtn} onPress={handleFetchSteam} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.fetchBtnText}>Consultar Biblioteca Steam</Text>
              </>
            )}
          </TouchableOpacity>

          {steamGames.length > 0 && (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>
                  {steamGames.length} Jogos Encontrados
                </Text>
                <TouchableOpacity style={styles.importBtn} onPress={handleImportSteamGames}>
                  <Text style={styles.importBtnText}>Confirmar Importação</Text>
                </TouchableOpacity>
              </View>

              {importSummary && (
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryText}>{importSummary}</Text>
                </View>
              )}

              {steamGames.slice(0, 15).map((g) => (
                <View key={g.externalId} style={styles.previewRow}>
                  {g.coverUrl ? (
                    <Image source={{ uri: g.coverUrl }} style={styles.previewCover} />
                  ) : null}
                  <View style={styles.previewInfo}>
                    <Text style={styles.gameTitle} numberOfLines={1}>
                      {g.title}
                    </Text>
                    <Text style={styles.gameTime}>
                      {Math.floor(g.playtimeMinutes / 60)}h {g.playtimeMinutes % 60}m jogados
                    </Text>
                  </View>
                </View>
              ))}
              {steamGames.length > 15 && (
                <Text style={styles.moreCount}>... e mais {steamGames.length - 15} títulos.</Text>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.label}>Usuário RetroAchievements:</Text>
          <TextInput
            style={styles.input}
            value={raUsername}
            onChangeText={setRaUsername}
            placeholder="Ex: SeuUsuario"
            placeholderTextColor={colors.dark.textMuted}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Web API Key (Opcional):</Text>
          <TextInput
            style={styles.input}
            value={raApiKey}
            onChangeText={setRaApiKey}
            placeholder="Obtenha em retroachievements.org/controlpanel.php"
            placeholderTextColor={colors.dark.textMuted}
            secureTextEntry
          />
          <Text style={styles.hint}>
            Importa o catálogo de jogos completados (com 100% de conquistas). Sua chave é transmitida de forma efêmera e não fica salva no servidor.
          </Text>

          <TouchableOpacity
            style={styles.fetchBtn}
            onPress={async () => {
              if (!raUsername.trim()) return;
              setIsLoading(true);
              try {
                const res = await ApiService.syncRetroAchievements(raUsername.trim(), raApiKey.trim());
                if (res.requiresKey) {
                  Alert.alert('Web API Key Necessária', res.message);
                } else {
                  setRaGames(res.games || []);
                }
              } catch (err: any) {
                Alert.alert('Erro', err.message);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <Text style={styles.fetchBtnText}>Consultar Jogos Completados</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeBtnText}>Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    color: colors.dark.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subTitle: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  tabBtnActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  tabText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 8,
  },
  label: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.dark.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.dark.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  hint: {
    color: colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  fetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.dark.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  fetchBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  previewContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    gap: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewTitle: {
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: '700',
  },
  importBtn: {
    backgroundColor: colors.dark.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  importBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryBadge: {
    backgroundColor: '#1E3A2F',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  summaryText: {
    color: colors.dark.success,
    fontSize: 13,
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    gap: 10,
  },
  previewCover: {
    width: 60,
    height: 30,
    borderRadius: 4,
  },
  previewInfo: {
    flex: 1,
  },
  gameTitle: {
    color: colors.dark.text,
    fontSize: 13,
    fontWeight: '600',
  },
  gameTime: {
    color: colors.dark.accent,
    fontSize: 11,
  },
  moreCount: {
    color: colors.dark.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  closeBtnText: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
