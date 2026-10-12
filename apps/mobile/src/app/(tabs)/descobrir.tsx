import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; tab?: string }>();

  const [activeTab, setActiveTab] = useState<'recommendations' | 'catalog'>('recommendations');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogGameSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [sessionSuitability, setSessionSuitability] = useState<
    'quick_burst' | 'medium_session' | 'deep_dive'
  >('medium_session');

  const bottomPadding = 80 + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

  const loadRecommendations = useCallback(() => {
    try {
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
    } catch (e) {
      console.error('Error loading recommendations:', e);
    }
  }, [sessionSuitability]);

  // Handle incoming query params (e.g. redirected from Library search)
  const initialSearchDone = useRef(false);
  useEffect(() => {
    if (params.q && typeof params.q === 'string' && !initialSearchDone.current) {
      initialSearchDone.current = true;
      setSearchQuery(params.q);
      setActiveTab('catalog');
      executeSearch(params.q);
    } else if (params.tab === 'catalog') {
      setActiveTab('catalog');
    }
  }, [params.q, params.tab]);

  useFocusEffect(
    useCallback(() => {
      loadRecommendations();
    }, [loadRecommendations])
  );

  const executeSearch = async (queryText: string) => {
    const term = queryText.trim();
    if (!term) return;

    Keyboard.dismiss();
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const res = await ApiService.searchCatalog(term);
      setSearchResults(res.results || []);

      if (res.provider === 'unavailable') {
        setSearchError(
          res.message ||
            'Catálogo online não configurado no servidor. Você pode cadastrar seus jogos manualmente com dados completos!'
        );
      }
    } catch (err: any) {
      setSearchResults([]);
      setSearchError(
        err.message || 'Falha ao buscar no catálogo online. Verifique sua conexão com a internet.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = () => {
    executeSearch(searchQuery);
  };

  const handleQuickAdd = async (gameSummary: CatalogGameSummary) => {
    const existingId = `catalog-${gameSummary.provider}-${gameSummary.providerId}`;
    const existing = GameRepository.getById(existingId) || GameRepository.getById(gameSummary.id);

    if (existing) {
      Alert.alert('Já cadastrado', `"${gameSummary.title}" já faz parte da sua biblioteca!`);
      return;
    }

    try {
      const details = await ApiService.getGameDetails(gameSummary.id).catch(() => null);

      const newId = existingId;
      GameRepository.upsert({
        id: newId,
        title: gameSummary.title,
        coverUrl: gameSummary.coverUrl,
        genres: (gameSummary.genres && gameSummary.genres.length > 0) ? gameSummary.genres : ['Ação'],
        platforms: (gameSummary.platforms && gameSummary.platforms.length > 0) ? gameSummary.platforms : ['PC'],
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

      // Default to backlog playthrough
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
      Alert.alert('Erro ao Salvar', err.message || 'Não foi possível adicionar o jogo.');
    }
  };

  const handleManualAddWithQuery = () => {
    const titleParam = encodeURIComponent(searchQuery.trim());
    router.push(`/modal/add-game?initialTitle=${titleParam}`);
  };

  return (
    <View style={styles.container}>
      {/* Sub Tabs Selector */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.subTabBtn, activeTab === 'recommendations' && styles.subTabBtnActive]}
          onPress={() => setActiveTab('recommendations')}
          activeOpacity={0.8}
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
            Sugestões
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, activeTab === 'catalog' && styles.subTabBtnActive]}
          onPress={() => setActiveTab('catalog')}
          activeOpacity={0.8}
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
            Buscar Catálogo
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
                  ⚡ &lt;30 min
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
                  🎮 1h - 2h
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
                  🌌 &gt;2h
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recommendations List */}
          {recommendations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="sparkles-outline" size={40} color={colors.dark.accent} />
              </View>
              <Text style={styles.emptyTitle}>Sem sugestões no momento</Text>
              <Text style={styles.emptySub}>
                Cadastre seus jogos no Backlog com plataformas e preferências para receber
                recomendações inteligentes!
              </Text>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => router.push('/modal/add-game')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={styles.primaryActionBtnText}>Adicionar Primeiro Jogo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={recommendations}
              keyExtractor={(item) => item.game.id}
              contentContainerStyle={[styles.recomList, { paddingBottom: bottomPadding }]}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.recomCard}
                  onPress={() => router.push(`/game/${item.game.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recomBadge}>
                    <Text style={styles.recomBadgeText}>#{index + 1} Prioridade</Text>
                  </View>
                  <View style={styles.recomContentRow}>
                    {item.game.coverUrl ? (
                      <Image source={{ uri: item.game.coverUrl }} style={styles.recomCover} />
                    ) : (
                      <View style={styles.recomCoverPlaceholder}>
                        <Ionicons name="game-controller-outline" size={24} color={colors.dark.textMuted} />
                      </View>
                    )}
                    <View style={styles.recomInfo}>
                      <Text style={styles.recomTitle} numberOfLines={1}>
                        {item.game.title}
                      </Text>
                      <Text style={styles.recomGenres} numberOfLines={1}>
                        {(item.game.genres || []).slice(0, 3).join(', ')}
                      </Text>

                      <View style={styles.reasonsBox}>
                        {(item.reasons || []).slice(0, 2).map((reason, rIdx) => (
                          <View key={rIdx} style={styles.reasonRow}>
                            <Ionicons name="checkmark-circle" size={12} color={colors.dark.accent} />
                            <Text style={styles.reasonText} numberOfLines={1}>{reason}</Text>
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
          {/* Header Link back to Library */}
          <View style={styles.returnHeaderRow}>
            <TouchableOpacity
              style={styles.backToLibBtn}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color={colors.dark.accent} />
              <Text style={styles.backToLibText}>Voltar para a Biblioteca</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input Bar */}
          <View style={styles.searchRow}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={colors.dark.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Nome do jogo (ex: Zelda, Elden Ring, Mario)..."
                placeholderTextColor={colors.dark.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoCapitalize="words"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={colors.dark.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearchSubmit}
              activeOpacity={0.8}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="search" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {isSearching && (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color={colors.dark.primary} />
              <Text style={styles.stateTitle}>Buscando no catálogo...</Text>
              <Text style={styles.stateSub}>Pesquisando capas e metadados oficiais</Text>
            </View>
          )}

          {/* Catalog Unavailable / API Error State */}
          {!isSearching && searchError && (
            <View style={styles.fallbackBox}>
              <View style={styles.fallbackIconRow}>
                <Ionicons name="cloud-offline-outline" size={28} color={colors.dark.gold} />
                <Text style={styles.fallbackTitle}>Catálogo Online Indisponível</Text>
              </View>
              <Text style={styles.fallbackText}>{searchError}</Text>
              <View style={styles.fallbackActions}>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleManualAddWithQuery}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={18} color="#FFF" />
                  <Text style={styles.primaryActionBtnText}>
                    {searchQuery.trim()
                      ? `Cadastrar "${searchQuery.trim()}" Manualmente`
                      : 'Cadastrar Jogo Manualmente'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Search Results List */}
          {!isSearching && (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => item.id || `game-${index}`}
              contentContainerStyle={[styles.catalogList, { paddingBottom: bottomPadding }]}
              renderItem={({ item }) => (
                <View style={styles.catalogCard}>
                  {item.coverUrl ? (
                    <Image source={{ uri: item.coverUrl }} style={styles.catalogCover} />
                  ) : (
                    <View style={styles.catalogCoverPlaceholder}>
                      <Ionicons name="game-controller-outline" size={24} color={colors.dark.textMuted} />
                    </View>
                  )}
                  <View style={styles.catalogInfo}>
                    <Text style={styles.catalogTitle} numberOfLines={1}>
                      {item.title || 'Título Desconhecido'}
                    </Text>
                    <Text style={styles.catalogMeta} numberOfLines={1}>
                      {item.releaseDate ? item.releaseDate.slice(0, 4) : 'Ano n/d'} •{' '}
                      {(item.genres || []).slice(0, 2).join(', ') || 'Geral'}
                    </Text>
                    <Text style={styles.catalogPlatforms} numberOfLines={1}>
                      {(item.platforms || []).slice(0, 3).join(' • ') || 'Multiplataforma'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.quickAddBtn}
                    onPress={() => handleQuickAdd(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="bookmark" size={14} color="#FFF" />
                    <Text style={styles.quickAddText}>+ Backlog</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                !searchError ? (
                  hasSearched ? (
                    <View style={styles.stateContainer}>
                      <View style={styles.emptyIconBg}>
                        <Ionicons name="search-outline" size={40} color={colors.dark.textMuted} />
                      </View>
                      <Text style={styles.stateTitle}>Nenhum jogo encontrado</Text>
                      <Text style={styles.stateSub}>
                        Não encontramos resultados para "{searchQuery}". Você pode cadastrá-lo
                        manualmente com capa e dados personalizados.
                      </Text>
                      <TouchableOpacity
                        style={styles.primaryActionBtn}
                        onPress={handleManualAddWithQuery}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle" size={18} color="#FFF" />
                        <Text style={styles.primaryActionBtnText}>
                          {searchQuery.trim()
                            ? `Cadastrar "${searchQuery.trim()}" Manualmente`
                            : 'Cadastrar Manualmente'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.stateContainer}>
                      <View style={styles.emptyIconBg}>
                        <Ionicons name="search" size={40} color={colors.dark.accent} />
                      </View>
                      <Text style={styles.stateTitle}>Pesquisar no Catálogo</Text>
                      <Text style={styles.stateSub}>
                        Digite o nome de qualquer jogo acima para buscar capas oficiais, plataformas
                        e estimativas de duração.
                      </Text>
                      <TouchableOpacity
                        style={[styles.primaryActionBtn, { backgroundColor: colors.dark.surface, borderColor: colors.dark.border, borderWidth: 1 }]}
                        onPress={() => router.push('/modal/add-game')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={18} color={colors.dark.text} />
                        <Text style={[styles.primaryActionBtnText, { color: colors.dark.text }]}>
                          Prefiro Cadastrar Manualmente
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                ) : null
              }
            />
          )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: colors.dark.surface,
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
    borderRadius: 10,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  subTabBtnActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  subTabText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  subTabTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  returnHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backToLibBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  backToLibText: {
    color: colors.dark.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  suitabilityContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  suitabilityLabel: {
    color: colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suitabilityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  suitabilityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
    alignItems: 'center',
  },
  suitabilityBtnActive: {
    backgroundColor: '#2D1612',
    borderColor: colors.dark.primary,
  },
  suitabilityBtnText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  suitabilityBtnTextActive: {
    color: colors.dark.primary,
    fontWeight: '800',
  },
  recomList: {
    padding: 16,
    gap: 12,
  },
  recomCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  recomBadge: {
    backgroundColor: colors.dark.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 10,
  },
  recomBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recomContentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  recomCover: {
    width: 68,
    height: 96,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
  },
  recomCoverPlaceholder: {
    width: 68,
    height: 96,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  recomInfo: {
    flex: 1,
  },
  recomTitle: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  recomGenres: {
    color: colors.dark.accent,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  reasonsBox: {
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
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackBox: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1E1710',
    borderWidth: 1,
    borderColor: colors.dark.gold,
  },
  fallbackIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  fallbackTitle: {
    color: colors.dark.gold,
    fontSize: 15,
    fontWeight: '800',
  },
  fallbackText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  fallbackActions: {
    flexDirection: 'row',
    gap: 8,
  },
  catalogList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  catalogCover: {
    width: 52,
    height: 72,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
  },
  catalogCoverPlaceholder: {
    width: 52,
    height: 72,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  catalogInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  catalogTitle: {
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: '700',
  },
  catalogMeta: {
    color: colors.dark.accent,
    fontSize: 12,
    fontWeight: '600',
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
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickAddText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 24,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  stateTitle: {
    color: colors.dark.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  stateSub: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
    marginBottom: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 30,
  },
  emptyTitle: {
    color: colors.dark.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySub: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'stretch',
  },
  primaryActionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
