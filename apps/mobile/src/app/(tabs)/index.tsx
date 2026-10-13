import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanonicalGame, Playthrough, PlaythroughStatus } from '@savestate/shared';
import { GameRepository } from '../../db/repositories/game-repo';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import { colors, statusColors } from '../../theme/colors';

type FilterStatus = 'all' | PlaythroughStatus;

interface GameListItem {
  game: CanonicalGame;
  playthrough?: Playthrough;
}

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<GameListItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [isGridView, setIsGridView] = useState(false);

  const bottomPadding = 80 + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

  const loadData = useCallback(() => {
    try {
      const games = GameRepository.getAll();
      const ptList = PlaythroughRepository.getAll();
      const ptMap = new Map(ptList.map((p) => [p.gameId, p]));

      const mapped: GameListItem[] = games.map((game) => ({
        game,
        playthrough: ptMap.get(game.id),
      }));

      setItems(mapped);
    } catch (e) {
      console.error('Failed to load library:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredItems = items.filter(({ game, playthrough }) => {
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      game.title.toLowerCase().includes(query) ||
      (game.genres || []).some((g) => g.toLowerCase().includes(query)) ||
      (game.platforms || []).some((p) => p.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    const currentStatus = playthrough?.status || 'backlog';
    return currentStatus === statusFilter;
  });

  // Categorized sections for default view
  const playingItems = items.filter(
    (i) => i.playthrough?.status === 'playing'
  );
  const backlogItems = items.filter(
    (i) => !i.playthrough || i.playthrough.status === 'backlog'
  );
  const beatenItems = items.filter(
    (i) => i.playthrough?.status === 'beaten' || i.playthrough?.status === 'completed'
  );

  const renderStatusPill = (status: PlaythroughStatus = 'backlog') => {
    const meta = statusColors[status] || statusColors.backlog;
    return (
      <View style={[styles.statusPill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
        <Text style={[styles.statusPillText, { color: meta.text }]}>{meta.label}</Text>
      </View>
    );
  };

  const handleSearchOnline = () => {
    router.push({
      pathname: '/(tabs)/descobrir',
      params: { tab: 'catalog', q: search.trim() },
    });
  };

  const handleManualAddWithQuery = () => {
    const titleParam = encodeURIComponent(search.trim());
    router.push(`/modal/add-game?initialTitle=${titleParam}`);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar & View Actions Row */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={colors.dark.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar na coleção por nome, gênero..."
            placeholderTextColor={colors.dark.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.viewToggleBtn}
          onPress={() => setIsGridView(!isGridView)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isGridView ? 'list' : 'grid'}
            size={18}
            color={colors.dark.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/modal/add-game')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips Row */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { id: 'all', label: `Todos (${items.length})` },
            { id: 'playing', label: `Jogando (${playingItems.length})` },
            { id: 'backlog', label: `Backlog (${backlogItems.length})` },
            { id: 'beaten', label: `Zerados (${beatenItems.length})` },
            { id: 'paused', label: 'Pausados' },
            { id: 'completed', label: '100%' },
            { id: 'abandoned', label: 'Abandonados' },
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setStatusFilter(item.id as FilterStatus)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* When Search is Active or a specific Status filter is chosen */}
      {(search.trim().length > 0 || statusFilter !== 'all') ? (
        filteredItems.length === 0 ? (
          <View style={styles.emptySearchContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="search-outline" size={36} color={colors.dark.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum jogo encontrado</Text>
            <Text style={styles.emptySub}>
              {search.trim()
                ? `Não encontramos "${search.trim()}" na sua biblioteca local.`
                : 'Não há jogos com o filtro selecionado.'}
            </Text>

            {search.trim().length > 0 && (
              <View style={styles.emptySearchActions}>
                <TouchableOpacity
                  style={styles.searchOnlineBtn}
                  onPress={handleSearchOnline}
                  activeOpacity={0.8}
                >
                  <Ionicons name="compass" size={18} color="#FFF" />
                  <Text style={styles.searchOnlineBtnText}>
                    Buscar "{search.trim()}" no Catálogo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.manualAddBtn}
                  onPress={handleManualAddWithQuery}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.dark.accent} />
                  <Text style={styles.manualAddBtnText}>
                    Cadastrar Manualmente
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            key={isGridView ? 'grid' : 'list'}
            numColumns={isGridView ? 2 : 1}
            keyExtractor={(item) => item.game.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
            renderItem={({ item }) => {
              const { game, playthrough } = item;
              if (isGridView) {
                return (
                  <TouchableOpacity
                    style={styles.gridCard}
                    onPress={() => router.push(`/game/${game.id}`)}
                    activeOpacity={0.7}
                  >
                    {game.coverUrl ? (
                      <Image source={{ uri: game.coverUrl }} style={styles.gridCover} />
                    ) : (
                      <View style={styles.gridCoverPlaceholder}>
                        <Ionicons name="game-controller-outline" size={32} color={colors.dark.textMuted} />
                      </View>
                    )}
                    <View style={styles.gridInfo}>
                      <Text style={styles.gridTitle} numberOfLines={2}>
                        {game.title}
                      </Text>
                      {renderStatusPill(playthrough?.status)}
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  style={styles.listCard}
                  onPress={() => router.push(`/game/${game.id}`)}
                  activeOpacity={0.7}
                >
                  {game.coverUrl ? (
                    <Image source={{ uri: game.coverUrl }} style={styles.listCover} />
                  ) : (
                    <View style={styles.listCoverPlaceholder}>
                      <Ionicons name="game-controller-outline" size={24} color={colors.dark.textMuted} />
                    </View>
                  )}
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {game.title}
                    </Text>
                    <Text style={styles.listGenres} numberOfLines={1}>
                      {(game.platforms || []).slice(0, 2).join(' • ') || 'PC'}
                    </Text>
                    <View style={styles.listMetaRow}>
                      {renderStatusPill(playthrough?.status)}
                      {playthrough && playthrough.totalPlaytimeMinutes > 0 && (
                        <Text style={styles.playtimeBadge}>
                          ⏱ {Math.floor(playthrough.totalPlaytimeMinutes / 60)}h{' '}
                          {playthrough.totalPlaytimeMinutes % 60}m
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                </TouchableOpacity>
              );
            }}
          />
        )
      ) : (
        /* Default Gamer Collection Dashboard View (All) */
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
        >
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="game-controller" size={44} color={colors.dark.primary} />
              </View>
              <Text style={styles.emptyTitle}>Sua Coleção Começa Aqui</Text>
              <Text style={styles.emptySub}>
                Organize seus jogos em andamento, backlog de futuras aventuras e registros de tempo
                100% offline.
              </Text>
              <TouchableOpacity
                style={styles.searchOnlineBtn}
                onPress={() => router.push('/modal/add-game')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={18} color="#FFF" />
                <Text style={styles.searchOnlineBtnText}>Cadastrar Primeiro Jogo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualAddBtn, { marginTop: 10 }]}
                onPress={() => router.push({ pathname: '/(tabs)/descobrir', params: { tab: 'catalog' } })}
                activeOpacity={0.8}
              >
                <Ionicons name="compass" size={18} color={colors.dark.accent} />
                <Text style={styles.manualAddBtnText}>Explorar Catálogo Online</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.sectionsContainer}>
              <View style={styles.collectionHero}>
                <View style={styles.collectionHeroTop}>
                  <View style={styles.collectionHeroMark}>
                    <Ionicons name="game-controller" size={22} color={colors.dark.primary} />
                  </View>
                  <View style={styles.collectionHeroCopy}>
                    <Text style={styles.collectionEyebrow}>SEU ARQUIVO DE JOGOS</Text>
                    <Text style={styles.collectionHeroTitle}>
                      {items.length} {items.length === 1 ? 'jogo salvo' : 'jogos salvos'}
                    </Text>
                  </View>
                  <Ionicons name="sparkles" size={18} color={colors.dark.accent} />
                </View>
                <View style={styles.collectionStatsRow}>
                  <View style={styles.collectionStat}>
                    <Text style={styles.collectionStatValue}>{playingItems.length}</Text>
                    <Text style={styles.collectionStatLabel}>JOGANDO</Text>
                  </View>
                  <View style={styles.collectionStatDivider} />
                  <View style={styles.collectionStat}>
                    <Text style={styles.collectionStatValue}>{backlogItems.length}</Text>
                    <Text style={styles.collectionStatLabel}>NO BACKLOG</Text>
                  </View>
                  <View style={styles.collectionStatDivider} />
                  <View style={styles.collectionStat}>
                    <Text style={styles.collectionStatValue}>{beatenItems.length}</Text>
                    <Text style={styles.collectionStatLabel}>CONCLUÍDOS</Text>
                  </View>
                </View>
              </View>

              {/* SECTION: Jogando Agora / Continuar */}
              {playingItems.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="play-circle" size={20} color={colors.dark.primary} />
                    <Text style={styles.sectionTitle}>Jogando Agora ({playingItems.length})</Text>
                  </View>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={playingItems}
                    keyExtractor={(item) => item.game.id}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.heroCard}
                        onPress={() => router.push(`/game/${item.game.id}`)}
                        activeOpacity={0.8}
                      >
                        {item.game.coverUrl ? (
                          <Image source={{ uri: item.game.coverUrl }} style={styles.heroCover} />
                        ) : (
                          <View style={styles.heroCoverPlaceholder}>
                            <Ionicons name="game-controller-outline" size={28} color={colors.dark.textMuted} />
                          </View>
                        )}
                        <View style={styles.heroInfo}>
                          <Text style={styles.heroTitle} numberOfLines={1}>
                            {item.game.title}
                          </Text>
                          <Text style={styles.heroPlaytime}>
                            ⏱ {Math.floor((item.playthrough?.totalPlaytimeMinutes || 0) / 60)}h{' '}
                            {(item.playthrough?.totalPlaytimeMinutes || 0) % 60}m jogados
                          </Text>
                          <View style={styles.continueBtn}>
                            <Text style={styles.continueBtnText}>Continuar ▶</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* SECTION: Próximos do Backlog */}
              {backlogItems.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="bookmarks" size={18} color={colors.dark.accent} />
                    <Text style={styles.sectionTitle}>Próximos do Backlog ({backlogItems.length})</Text>
                  </View>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={backlogItems}
                    keyExtractor={(item) => item.game.id}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.backlogCard}
                        onPress={() => router.push(`/game/${item.game.id}`)}
                        activeOpacity={0.8}
                      >
                        {item.game.coverUrl ? (
                          <Image source={{ uri: item.game.coverUrl }} style={styles.backlogCover} />
                        ) : (
                          <View style={styles.backlogCoverPlaceholder}>
                            <Ionicons name="game-controller-outline" size={24} color={colors.dark.textMuted} />
                          </View>
                        )}
                        <Text style={styles.backlogTitle} numberOfLines={2}>
                          {item.game.title}
                        </Text>
                        <Text style={styles.backlogPlatform} numberOfLines={1}>
                          {(item.game.platforms || [])[0] || 'PC'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* SECTION: Toda a Coleção */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="library" size={18} color={colors.dark.textSecondary} />
                  <Text style={styles.sectionTitle}>Todos os Jogos ({items.length})</Text>
                </View>
                <View style={styles.collectionGrid}>
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item.game.id}
                      style={styles.collectionItemCard}
                      onPress={() => router.push(`/game/${item.game.id}`)}
                      activeOpacity={0.7}
                    >
                      {item.game.coverUrl ? (
                        <Image source={{ uri: item.game.coverUrl }} style={styles.collectionCover} />
                      ) : (
                        <View style={styles.collectionCoverPlaceholder}>
                          <Ionicons name="game-controller-outline" size={24} color={colors.dark.textMuted} />
                        </View>
                      )}
                      <Text style={styles.collectionItemTitle} numberOfLines={1}>
                        {item.game.title}
                      </Text>
                      {renderStatusPill(item.playthrough?.status)}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
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
  searchBarRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  viewToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    backgroundColor: colors.dark.surface,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  filterChipText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  listCover: {
    width: 54,
    height: 74,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
  },
  listCoverPlaceholder: {
    width: 54,
    height: 74,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  listTitle: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  listGenres: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playtimeBadge: {
    color: colors.dark.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  gridCard: {
    flex: 1,
    margin: 6,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  gridCover: {
    width: '100%',
    height: 140,
    backgroundColor: colors.dark.inputBg,
  },
  gridCoverPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridInfo: {
    padding: 10,
    gap: 6,
  },
  gridTitle: {
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionsContainer: {
    paddingTop: 14,
    paddingBottom: 18,
    gap: 22,
  },
  collectionHero: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
    borderTopColor: colors.dark.primary,
    borderTopWidth: 2,
  },
  collectionHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  collectionHeroMark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#35241E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionHeroCopy: {
    flex: 1,
  },
  collectionEyebrow: {
    color: colors.dark.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  collectionHeroTitle: {
    color: colors.dark.text,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  collectionStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  collectionStat: {
    flex: 1,
    gap: 3,
  },
  collectionStatValue: {
    color: colors.dark.text,
    fontSize: 20,
    fontWeight: '900',
  },
  collectionStatLabel: {
    color: colors.dark.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  collectionStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.dark.border,
    marginHorizontal: 10,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroCard: {
    flexDirection: 'row',
    width: 280,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
    alignItems: 'center',
  },
  heroCover: {
    width: 68,
    height: 94,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
  },
  heroCoverPlaceholder: {
    width: 68,
    height: 94,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  heroTitle: {
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: '800',
  },
  heroPlaytime: {
    color: colors.dark.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  continueBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#351813',
    borderColor: colors.dark.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  continueBtnText: {
    color: colors.dark.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  backlogCard: {
    width: 120,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
    alignItems: 'center',
  },
  backlogCover: {
    width: 100,
    height: 130,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    marginBottom: 8,
  },
  backlogCoverPlaceholder: {
    width: 100,
    height: 130,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  backlogTitle: {
    color: colors.dark.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  backlogPlatform: {
    color: colors.dark.accent,
    fontSize: 10,
    fontWeight: '600',
  },
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  collectionItemCard: {
    width: '33.33%',
    padding: 4,
    alignItems: 'center',
    marginBottom: 10,
  },
  collectionCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    marginBottom: 6,
  },
  collectionCoverPlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  collectionItemTitle: {
    color: colors.dark.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 30,
  },
  emptyIconBg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  emptyTitle: {
    color: colors.dark.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
    marginBottom: 20,
  },
  emptySearchActions: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  searchOnlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  searchOnlineBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  manualAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  manualAddBtnText: {
    color: colors.dark.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
