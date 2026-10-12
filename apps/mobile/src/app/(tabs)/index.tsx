import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const [items, setItems] = useState<GameListItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [isGridView, setIsGridView] = useState(false);

  const loadData = useCallback(() => {
    const games = GameRepository.getAll();
    const ptList = PlaythroughRepository.getAll();
    const ptMap = new Map(ptList.map((p) => [p.gameId, p]));

    const mapped: GameListItem[] = games.map((game) => ({
      game,
      playthrough: ptMap.get(game.id),
    }));

    setItems(mapped);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredItems = items.filter(({ game, playthrough }) => {
    const matchesSearch =
      game.title.toLowerCase().includes(search.toLowerCase()) ||
      game.genres.some((g) => g.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    const currentStatus = playthrough?.status || 'backlog';
    return currentStatus === statusFilter;
  });

  const renderStatusPill = (status: PlaythroughStatus = 'backlog') => {
    const meta = statusColors[status] || statusColors.backlog;
    return (
      <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
        <Text style={[styles.statusPillText, { color: meta.text }]}>{meta.label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search & View Toggle Header */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={colors.dark.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar na biblioteca..."
            placeholderTextColor={colors.dark.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.viewToggleBtn}
          onPress={() => setIsGridView(!isGridView)}
        >
          <Ionicons
            name={isGridView ? 'list' : 'grid'}
            size={20}
            color={colors.dark.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/modal/add-game')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { id: 'all', label: 'Todos' },
            { id: 'playing', label: 'Jogando' },
            { id: 'backlog', label: 'Backlog' },
            { id: 'paused', label: 'Pausado' },
            { id: 'beaten', label: 'Zerado' },
            { id: 'completed', label: '100%' },
            { id: 'abandoned', label: 'Abandonado' },
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setStatusFilter(item.id as FilterStatus)}
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

      {/* Game List / Grid */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="game-controller-outline" size={64} color={colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>Nenhum jogo encontrado</Text>
          <Text style={styles.emptySub}>
            {search
              ? 'Tente outro termo na busca ou limpe o filtro.'
              : 'Sua biblioteca está vazia. Adicione jogos para começar a organizar seus saves!'}
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => router.push('/modal/add-game')}
          >
            <Text style={styles.emptyActionBtnText}>Adicionar Primeiro Jogo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          key={isGridView ? 'grid' : 'list'}
          numColumns={isGridView ? 2 : 1}
          keyExtractor={(item) => item.game.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const { game, playthrough } = item;
            if (isGridView) {
              return (
                <TouchableOpacity
                  style={styles.gridCard}
                  onPress={() => router.push(`/game/${game.id}`)}
                >
                  {game.coverUrl ? (
                    <Image source={{ uri: game.coverUrl }} style={styles.gridCover} />
                  ) : (
                    <View style={styles.gridCoverPlaceholder}>
                      <Ionicons name="image-outline" size={32} color={colors.dark.textMuted} />
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
              >
                {game.coverUrl ? (
                  <Image source={{ uri: game.coverUrl }} style={styles.listCover} />
                ) : (
                  <View style={styles.listCoverPlaceholder}>
                    <Ionicons name="image-outline" size={24} color={colors.dark.textMuted} />
                  </View>
                )}
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {game.title}
                  </Text>
                  <Text style={styles.listGenres} numberOfLines={1}>
                    {game.genres.slice(0, 3).join(' • ') || game.platforms.slice(0, 2).join(' • ')}
                  </Text>
                  <View style={styles.listFooter}>
                    {renderStatusPill(playthrough?.status)}
                    {playthrough?.totalPlaytimeMinutes ? (
                      <Text style={styles.listTimeText}>
                        {Math.floor(playthrough.totalPlaytimeMinutes / 60)}h{' '}
                        {playthrough.totalPlaytimeMinutes % 60}m
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  searchInput: {
    flex: 1,
    color: colors.dark.text,
    fontSize: 15,
  },
  viewToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  filterChipText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 8,
  },
  listCover: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
  },
  listCoverPlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listTitle: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  listGenres: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listTimeText: {
    color: colors.dark.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridCard: {
    flex: 1,
    margin: 6,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
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
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
    marginBottom: 20,
  },
  emptyActionBtn: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
