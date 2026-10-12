import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CanonicalGame, Playthrough, PlaythroughStatus, PriorityLevel } from '@savestate/shared';
import { GameRepository } from '../../db/repositories/game-repo';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import { colors, statusColors } from '../../theme/colors';

export default function GameDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<CanonicalGame | null>(null);
  const [playthrough, setPlaythrough] = useState<Playthrough | null>(null);

  const loadData = useCallback(() => {
    if (!id) return;
    const g = GameRepository.getById(id);
    setGame(g);
    if (g) {
      const pts = PlaythroughRepository.getByGameId(g.id);
      setPlaythrough(pts[0] || null);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (!game) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>Jogo não encontrado</Text>
      </View>
    );
  }

  const handleUpdateStatus = (newStatus: PlaythroughStatus) => {
    const updated: Playthrough = playthrough
      ? { ...playthrough, status: newStatus, updatedAt: new Date().toISOString() }
      : {
          id: `pt-${Date.now()}`,
          gameId: game.id,
          status: newStatus,
          priority: 'medium',
          isReplay: false,
          totalPlaytimeMinutes: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    PlaythroughRepository.upsert(updated);
    setPlaythrough(updated);
  };

  const handleUpdatePriority = (newPriority: PriorityLevel) => {
    if (!playthrough) return;
    const updated: Playthrough = {
      ...playthrough,
      priority: newPriority,
      updatedAt: new Date().toISOString(),
    };
    PlaythroughRepository.upsert(updated);
    setPlaythrough(updated);
  };

  const handleDelete = () => {
    Alert.alert(
      'Remover Jogo',
      `Tem certeza que deseja remover "${game.title}" da sua biblioteca? Todo o histórico de progresso e notas será apagado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            GameRepository.delete(game.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with Cover & Basic Info */}
      <View style={styles.headerRow}>
        {game.coverUrl ? (
          <Image source={{ uri: game.coverUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="image-outline" size={32} color={colors.dark.textMuted} />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.gameTitle}>{game.title}</Text>
          {game.releaseDate && (
            <Text style={styles.metaText}>Lançamento: {game.releaseDate}</Text>
          )}
          {game.developer && (
            <Text style={styles.metaText}>Estúdio: {game.developer}</Text>
          )}
          <View style={styles.badgeRow}>
            {game.platforms.slice(0, 3).map((plat, idx) => (
              <View key={idx} style={styles.platBadge}>
                <Text style={styles.platBadgeText}>{plat}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Status Selector */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Status da Jogatina</Text>
        <View style={styles.statusGrid}>
          {(['backlog', 'playing', 'paused', 'beaten', 'completed', 'abandoned'] as PlaythroughStatus[]).map(
            (st) => {
              const meta = statusColors[st];
              const isSelected = (playthrough?.status || 'backlog') === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusBtn,
                    { backgroundColor: isSelected ? meta.bg : colors.dark.inputBg },
                    isSelected && { borderColor: meta.text, borderWidth: 1.5 },
                  ]}
                  onPress={() => handleUpdateStatus(st)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      { color: isSelected ? meta.text : colors.dark.textSecondary },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {/* Priority Selector */}
        <Text style={[styles.cardHeader, { marginTop: 14 }]}>Prioridade no Backlog</Text>
        <View style={styles.priorityRow}>
          {(['low', 'medium', 'high'] as PriorityLevel[]).map((pr) => {
            const isSelected = (playthrough?.priority || 'medium') === pr;
            const labels = { low: 'Baixa', medium: 'Média', high: 'Alta' };
            return (
              <TouchableOpacity
                key={pr}
                style={[
                  styles.priorityBtn,
                  isSelected && styles.priorityBtnActive,
                ]}
                onPress={() => handleUpdatePriority(pr)}
              >
                <Text
                  style={[
                    styles.priorityBtnText,
                    isSelected && styles.priorityBtnTextActive,
                  ]}
                >
                  {labels[pr]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Campaign Details Action */}
      {playthrough && (
        <TouchableOpacity
          style={styles.openCampaignBtn}
          onPress={() => router.push(`/playthrough/${playthrough.id}`)}
        >
          <Ionicons name="play-forward" size={18} color="#FFF" />
          <Text style={styles.openCampaignText}>Abrir Campanha, Checklists e Sessões</Text>
        </TouchableOpacity>
      )}

      {/* Estimated Durations */}
      {game.estimatedDurationHours && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Duração Estimada (HowLongToBeat / RAWG)</Text>
          <View style={styles.durationRow}>
            {game.estimatedDurationHours.mainStory && (
              <View style={styles.durationBox}>
                <Text style={styles.durationNumber}>
                  {game.estimatedDurationHours.mainStory}h
                </Text>
                <Text style={styles.durationLabel}>História</Text>
              </View>
            )}
            {game.estimatedDurationHours.mainExtra && (
              <View style={styles.durationBox}>
                <Text style={styles.durationNumber}>
                  {game.estimatedDurationHours.mainExtra}h
                </Text>
                <Text style={styles.durationLabel}>História + Extras</Text>
              </View>
            )}
            {game.estimatedDurationHours.completionist && (
              <View style={styles.durationBox}>
                <Text style={styles.durationNumber}>
                  {game.estimatedDurationHours.completionist}h
                </Text>
                <Text style={styles.durationLabel}>100% Platina</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Game Description */}
      {game.description && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Sinopse</Text>
          <Text style={styles.descriptionText}>{game.description}</Text>
        </View>
      )}

      {/* Delete Game */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color={colors.dark.danger} />
        <Text style={styles.deleteBtnText}>Remover Jogo da Biblioteca</Text>
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
    padding: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: colors.dark.textSecondary,
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 14,
  },
  coverImage: {
    width: 100,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
  },
  coverPlaceholder: {
    width: 100,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  gameTitle: {
    color: colors.dark.text,
    fontSize: 20,
    fontWeight: '800',
  },
  metaText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  platBadge: {
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  platBadgeText: {
    color: colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  cardHeader: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  priorityBtnActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  priorityBtnText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  openCampaignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  openCampaignText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationBox: {
    flex: 1,
    backgroundColor: colors.dark.inputBg,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  durationNumber: {
    color: colors.dark.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  durationLabel: {
    color: colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  descriptionText: {
    color: colors.dark.text,
    fontSize: 14,
    lineHeight: 22,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#45161A',
    backgroundColor: '#201012',
    marginTop: 8,
  },
  deleteBtnText: {
    color: colors.dark.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
