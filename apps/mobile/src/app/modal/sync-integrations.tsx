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
    const existingByTitle = new Map(existingGames.map((game) => [game.title.toLowerCase().trim(), game]));
    const existingBySteamId = new Map(
      existingGames
        .filter((game) => game.externalIds.steam)
        .map((game) => [String(game.externalIds.steam), game])
    );

    for (const g of steamGames) {
      const matched = existingBySteamId.get(String(g.externalId)) || existingByTitle.get(g.title.toLowerCase().trim());
      const now = new Date().toISOString();
      const gameId = matched?.id || `steam-${g.externalId}`;

      if (matched) {
        GameRepository.upsert({
          ...matched,
          coverUrl: matched.coverUrl || g.coverUrl,
          platforms: matched.platforms.length > 0 ? matched.platforms : ['PC'],
          externalIds: { ...matched.externalIds, steam: Number(g.externalId) },
          fetchedAt: now,
          updatedAt: now,
        });

        const current = PlaythroughRepository.getByGameId(matched.id)[0];
        if (current && g.playtimeMinutes > current.totalPlaytimeMinutes) {
          PlaythroughRepository.upsert({
            ...current,
            totalPlaytimeMinutes: g.playtimeMinutes,
            lastPlayedAt: g.lastPlayedAt || current.lastPlayedAt,
            updatedAt: now,
          });
          updated++;
        } else if (!current) {
          PlaythroughRepository.upsert({
            id: `pt-steam-${g.externalId}`,
            gameId: matched.id,
            status: g.playtimeMinutes > 0 ? 'paused' : 'backlog',
            priority: 'medium',
            isReplay: false,
            totalPlaytimeMinutes: g.playtimeMinutes,
            lastPlayedAt: g.lastPlayedAt,
            createdAt: now,
            updatedAt: now,
          });
          updated++;
        } else {
          skipped++;
        }
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
        fetchedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      GameRepository.upsert(canonicalGame);

      GameRepository.upsertCopy({
        id: `copy-steam-${g.externalId}`,
        gameId,
        platform: 'PC',
        store: 'Steam',
        ownershipType: 'digital',
        createdAt: now,
        updatedAt: now,
      });

      PlaythroughRepository.upsert({
        id: `pt-steam-${g.externalId}`,
        gameId,
        status: g.playtimeMinutes > 0 ? 'paused' : 'backlog',
        priority: 'medium',
        isReplay: false,
        totalPlaytimeMinutes: g.playtimeMinutes,
        lastPlayedAt: g.lastPlayedAt,
        createdAt: now,
        updatedAt: now,
      });

      existingByTitle.set(g.title.toLowerCase().trim(), canonicalGame);
      existingBySteamId.set(String(g.externalId), canonicalGame);
      added++;
    }

    setImportSummary(`Importação concluída: ${added} adicionados, ${updated} atualizados, ${skipped} já existentes.`);
  };

  const handleImportRetroGames = () => {
    let added = 0;
    let linked = 0;
    const existingGames = GameRepository.getAll();
    const byTitle = new Map(existingGames.map((game) => [game.title.toLowerCase().trim(), game]));
    const byRetroId = new Map(
      existingGames
        .filter((game) => game.externalIds.retroachievements)
        .map((game) => [String(game.externalIds.retroachievements), game])
    );

    for (const retroGame of raGames) {
      const now = new Date().toISOString();
      const matched = byRetroId.get(String(retroGame.externalId)) || byTitle.get(retroGame.title.toLowerCase().trim());

      if (matched) {
        GameRepository.upsert({
          ...matched,
          coverUrl: matched.coverUrl || retroGame.coverUrl,
          platforms: matched.platforms.length > 0 ? matched.platforms : [retroGame.consoleName],
          externalIds: { ...matched.externalIds, retroachievements: retroGame.externalId },
          fetchedAt: now,
          updatedAt: now,
        });
        const current = PlaythroughRepository.getByGameId(matched.id)[0];
        if (!current) {
          PlaythroughRepository.upsert({
            id: `pt-ra-${retroGame.externalId}`,
            gameId: matched.id,
            status: retroGame.isMastered ? 'completed' : 'beaten',
            priority: 'medium',
            isReplay: false,
            totalPlaytimeMinutes: 0,
            notes: `RetroAchievements: ${retroGame.numAwarded}/${retroGame.numAchievements} conquistas desbloqueadas.`,
            finishDate: now,
            createdAt: now,
            updatedAt: now,
          });
        }
        linked++;
        continue;
      }

      const gameId = `ra-${retroGame.externalId}`;
      const game: CanonicalGame = {
        id: gameId,
        title: retroGame.title,
        coverUrl: retroGame.coverUrl,
        genres: ['RetroAchievements'],
        platforms: [retroGame.consoleName],
        source: 'retroachievements',
        externalIds: { retroachievements: retroGame.externalId },
        fetchedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      GameRepository.upsert(game);
      PlaythroughRepository.upsert({
        id: `pt-${gameId}`,
        gameId,
        status: retroGame.isMastered ? 'completed' : 'beaten',
        priority: 'medium',
        isReplay: false,
        totalPlaytimeMinutes: 0,
        notes: `RetroAchievements: ${retroGame.numAwarded}/${retroGame.numAchievements} conquistas desbloqueadas.`,
        finishDate: now,
        createdAt: now,
        updatedAt: now,
      });
      byTitle.set(game.title.toLowerCase().trim(), game);
      byRetroId.set(String(retroGame.externalId), game);
      added++;
    }

    setImportSummary(`RetroAchievements: ${added} jogos adicionados; ${linked} vinculados a jogos já cadastrados.`);
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

          <Text style={[styles.label, { marginTop: 10 }]}>Web API Key:</Text>
          <TextInput
            style={styles.input}
            value={raApiKey}
            onChangeText={setRaApiKey}
            placeholder="Obtenha em retroachievements.org/controlpanel.php"
            placeholderTextColor={colors.dark.textMuted}
            secureTextEntry
          />
          <Text style={styles.hint}>
            A chave é necessária para consultar sua conta. Importamos o progresso disponível e vinculamos títulos existentes sem apagar seus dados locais.
          </Text>

          <TouchableOpacity
            style={styles.fetchBtn}
            onPress={async () => {
              if (!raUsername.trim()) {
                Alert.alert('Informe seu usuário', 'Digite seu nome de usuário do RetroAchievements.');
                return;
              }
              setIsLoading(true);
              setImportSummary(null);
              try {
                const res = await ApiService.syncRetroAchievements(raUsername.trim(), raApiKey.trim());
                if (res.requiresKey) {
                  Alert.alert('Web API Key Necessária', res.message);
                } else {
                  setRaGames(res.games || []);
                  if (!(res.games || []).length) {
                    Alert.alert('Nenhum jogo encontrado', 'A conta não retornou jogos concluídos para importar.');
                  }
                }
              } catch (err: any) {
                Alert.alert('Erro', err.message);
              } finally {
                setRaApiKey('');
                setIsLoading(false);
              }
            }}
          >
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.fetchBtnText}>Consultar Jogos Concluídos</Text>}
          </TouchableOpacity>

          {raGames.length > 0 && (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>{raGames.length} jogos encontrados</Text>
                <TouchableOpacity style={styles.importBtn} onPress={handleImportRetroGames}>
                  <Text style={styles.importBtnText}>Importar</Text>
                </TouchableOpacity>
              </View>

              {importSummary && (
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryText}>{importSummary}</Text>
                </View>
              )}

              {raGames.slice(0, 20).map((game) => (
                <View key={game.externalId} style={styles.previewRow}>
                  {game.coverUrl ? <Image source={{ uri: game.coverUrl }} style={styles.previewCover} /> : null}
                  <View style={styles.previewInfo}>
                    <Text style={styles.gameTitle} numberOfLines={1}>{game.title}</Text>
                    <Text style={styles.gameTime}>
                      {game.consoleName} · {game.numAwarded}/{game.numAchievements} conquistas
                    </Text>
                  </View>
                  {game.isMastered && <Ionicons name="trophy" size={16} color={colors.dark.gold} />}
                </View>
              ))}
              {raGames.length > 20 && (
                <Text style={styles.moreCount}>... e mais {raGames.length - 20} jogos.</Text>
              )}
            </View>
          )}
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
