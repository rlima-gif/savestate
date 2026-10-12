import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  CatalogGameSummary,
  calculateRecommendations,
  RecommendationResult,
} from '@savestate/shared';
import { ApiService } from '../../services/api';
import { GameRepository } from '../../db/repositories/game-repo';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import { colors } from '../../theme/colors';

export default function DescobrirScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'recommendations' | 'catalog'>('recommendations');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogGameSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [sessionSuitability, setSessionSuitability] = useState<'quick_burst' | 'medium_session' | 'deep_dive'>('medium_session');

  const loadRecommendations = useCallback(() => {
    const games = GameRepository.getAll();
    const ptList = PlaythroughRepository.getAll();
    const ptMap = new Map(ptList.map((p) => [p.gameId, p]));

    const candidates = games.map((game) => ({
      game,
      playthrough: ptMap.get(game.id),
      ownedCopy: GameRepository.getCopiesForGame(game.id)[0],
    }));

    const results = calculateRecommendations(candidates, {
      sessionSuitability,
    });
    setRecommendations(results);
  }, [sessionSuitability]);

  useFocusEffect(
    useCallback(() => {
      loadRecommendations();
    }, [loadRecommendations])
  );

  const handleSearchCatalog = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await ApiService.searchCatalog(searchQuery);
      setSearchResults(res.results);
    } catch (err: any) {
      setSearchError(err.message || 'Falha ao buscar no catálogo.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickAdd = async (gameSummary: CatalogGameSummary) => {
    const existing = GameRepository.getById(`catalog-${gameSummary.provider}-${gameSummary.providerId}`);
    if (existing) {
      Alert.alert('Já existe', 'Este jogo já está na sua biblioteca!');
      return;
    }

    try {
      // Fetch details or create directly
      const details = await ApiService.getGameDetails(gameSummary.id).catch(() => null);

      const newId = `catalog-${gameSummary.provider}-${gameSummary.providerId}`;
      GameRepository.upsert({
        id: newId,
        title: gameSummary.title,
        coverUrl: gameSummary.coverUrl,
        genres: gameSummary.genres || [],
        platforms: gameSummary.platforms || [],
        releaseDate: gameSummary.releaseDate,
        description: details?.description,
        source: gameSummary.provider as any,
        externalIds: {
          [gameSummary.provider]: gameSummary.providerId,
        },
        estimatedDurationHours: details?.estimatedDurationHours,
        fetchedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Default backlog playthrough
      PlaythroughRepository.upsert({
        id: `pt-${Date.now()}`,
        gameId: newId,
        status: 'backlog',
        priority: 'medium',
        isReplay: false,
        totalPlaytimeMinutes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Sucesso!', `"${gameSummary.title}" foi adicionado ao seu Backlog.`);
      loadRecommendations();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.subTabBtn, activeTab === 'recommendations' && styles.subTabBtnActive]}
          onPress={() => setActiveTab('recommendations')}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={activeTab === 'recommendations' ? '#FFF' : colors.dark.textSecondary}
          />
          <Text
            style={[
              styles.subTabText,
              activeTab === 'recommendations' && styles.subTabTextActive,
            ]}
          >
            O Que Jogar a Seguir?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, activeTab === 'catalog' && styles.subTabBtnActive]}
          onPress={() => setActiveTab('catalog')}
        >
          <Ionicons
            name="search"
            size={16}
            color={activeTab === 'catalog' ? '#FFF' : colors.dark.textSecondary}
          />
          <Text
            style={[
              styles.subTabText,
              activeTab === 'catalog' && styles.subTabTextActive,
            ]}
          >
            Buscar no Catálogo
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'recommendations' ? (
        <View style={styles.flex1}>
          {/* Session Suitability Selector */}
          <View style={styles.suitabilityContainer}>
            <Text style={styles.suitabilityLabel}>Tempo disponível para a sessão:</Text>
            <View style={styles.suitabilityButtons}>
              <TouchableOpacity
                style={[
                  styles.suitabilityBtn,
                  sessionSuitability === 'quick_burst' && styles.suitabilityBtnActive,
                ]}
                onPress={() => setSessionSuitability('quick_burst')}
              >
                <Text
                  style={[
                    styles.suitabilityBtnText,
                    sessionSuitability === 'quick_burst' && styles.suitabilityBtnTextActive,
                  ]}
                >
                  ⚡ Rápido (&lt;30m)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.suitabilityBtn,
                  sessionSuitability === 'medium_session' && styles.suitabilityBtnActive,
                ]}
                onPress={() => setSessionSuitability('medium_session')}
              >
                <Text
                  style={[
                    styles.suitabilityBtnText,
                    sessionSuitability === 'medium_session' && styles.suitabilityBtnTextActive,
                  ]}
                >
                  🎮 Padrão (1h-2h)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.suitabilityBtn,
                  sessionSuitability === 'deep_dive' && styles.suitabilityBtnActive,
                ]}
                onPress={() => setSessionSuitability('deep_dive')}
              >
                <Text
                  style={[
                    styles.suitabilityBtnText,
                    sessionSuitability === 'deep_dive' && styles.suitabilityBtnTextActive,
                  ]}
                >
                  🌌 Imersão (&gt;2h)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recommendations List */}
          {recommendations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={colors.dark.textMuted} />
              <Text style={styles.emptyTitle}>Sem sugestões no momento</Text>
              <Text style={styles.emptySub}>
                Adicione mais jogos ao seu Backlog ou cadastre suas plataformas para receber
                recomendações inteligentes baseadas em regras transparentes!
              </Text>
            </View>
          ) : (
            <FlatList
              data={recommendations}
              keyExtractor={(item) => item.game.id}
              contentContainerStyle={styles.recomList}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.recomCard}
                  onPress={() => router.push(`/game/${item.game.id}`)}
                >
                  <View style={styles.recomBadge}>
                    <Text style={styles.recomBadgeText}>#{index + 1} Sugestão</Text>
                  </View>
                  <View style={styles.recomContentRow}>
                    {item.game.coverUrl ? (
                      <Image source={{ uri: item.game.coverUrl }} style={styles.recomCover} />
                    ) : (
                      <View style={styles.recomCoverPlaceholder}>
                        <Ionicons name="image-outline" size={24} color={colors.dark.textMuted} />
                      </View>
                    )}
                    <View style={styles.recomInfo}>
                      <Text style={styles.recomTitle} numberOfLines={1}>
                        {item.game.title}
                      </Text>
                      <Text style={styles.recomGenres} numberOfLines={1}>
                        {item.game.genres.slice(0, 3).join(', ')}
                      </Text>

                      {/* Reasons list */}
                      <View style={styles.reasonsBox}>
                        {item.reasons.map((reason, rIdx) => (
                          <View key={rIdx} style={styles.reasonRow}>
                            <Ionicons name="checkmark-circle" size={12} color={colors.dark.accent} />
                            <Text style={styles.reasonText}>{reason}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : (
        /* Catalog Search View */
        <View style={styles.flex1}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Digite o nome do jogo (ex: Zelda, Elden Ring)..."
              placeholderTextColor={colors.dark.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchCatalog}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearchCatalog}>
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="search" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {searchError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{searchError}</Text>
            </View>
          )}

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.catalogList}
            renderItem={({ item }) => (
              <View style={styles.catalogCard}>
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.catalogCover} />
                ) : (
                  <View style={styles.catalogCoverPlaceholder}>
                    <Ionicons name="image-outline" size={24} color={colors.dark.textMuted} />
                  </View>
                )}
                <View style={styles.catalogInfo}>
                  <Text style={styles.catalogTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.catalogMeta} numberOfLines={1}>
                    {item.releaseDate ? item.releaseDate.slice(0, 4) : 'Ano desconhecido'} •{' '}
                    {item.genres.slice(0, 2).join(', ')}
                  </Text>
                  <Text style={styles.catalogPlatforms} numberOfLines={1}>
                    {item.platforms.slice(0, 3).join(' • ')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.quickAddBtn}
                  onPress={() => handleQuickAdd(item)}
                >
                  <Ionicons name="bookmark-outline" size={16} color="#FFF" />
                  <Text style={styles.quickAddText}>+ Salvar</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              !isSearching && !searchError ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color={colors.dark.textMuted} />
                  <Text style={styles.emptyTitle}>Busque qualquer jogo</Text>
                  <Text style={styles.emptySub}>
                    Pesquise milhares de títulos para adicionar capas reais, gêneros e durações
                    estimadas ao seu backlog.
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  flex1: {
    flex: 1,
  },
  tabToggleRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  subTabBtn: {
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
  subTabBtnActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  subTabText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  suitabilityContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  suitabilityLabel: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  suitabilityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  suitabilityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
  },
  suitabilityBtnActive: {
    backgroundColor: '#351F1A',
    borderColor: colors.dark.accent,
  },
  suitabilityBtnText: {
    color: colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  suitabilityBtnTextActive: {
    color: colors.dark.accent,
    fontWeight: '700',
  },
  recomList: {
    padding: 16,
    gap: 12,
  },
  recomCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 10,
  },
  recomBadge: {
    backgroundColor: colors.dark.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  recomBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  recomContentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  recomCover: {
    width: 65,
    height: 90,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
  },
  recomCoverPlaceholder: {
    width: 65,
    height: 90,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recomInfo: {
    flex: 1,
  },
  recomTitle: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
  },
  recomGenres: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    marginVertical: 2,
  },
  reasonsBox: {
    marginTop: 6,
    gap: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
  },
  searchRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.dark.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#351214',
    borderWidth: 1,
    borderColor: colors.dark.danger,
  },
  errorBannerText: {
    color: colors.dark.danger,
    fontSize: 13,
  },
  catalogList: {
    padding: 16,
    gap: 10,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 8,
  },
  catalogCover: {
    width: 50,
    height: 68,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
  },
  catalogCoverPlaceholder: {
    width: 50,
    height: 68,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogInfo: {
    flex: 1,
    marginLeft: 10,
  },
  catalogTitle: {
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: '700',
  },
  catalogMeta: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    marginVertical: 2,
  },
  catalogPlatforms: {
    color: colors.dark.textMuted,
    fontSize: 11,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickAddText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    color: colors.dark.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
