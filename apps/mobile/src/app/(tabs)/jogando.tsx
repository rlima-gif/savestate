import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanonicalGame, Playthrough } from '@savestate/shared';
import { GameRepository } from '../../db/repositories/game-repo';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import {
  getActiveTimer,
  startTimer,
  pauseTimer,
  stopAndSaveTimer,
  clearTimer,
  formatSecondsToTimerString,
  ActiveTimerState,
} from '../../services/timer';
import { colors } from '../../theme/colors';

interface ContinueGameItem {
  game: CanonicalGame;
  playthrough: Playthrough;
}

export default function JogandoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeItems, setActiveItems] = useState<ContinueGameItem[]>([]);
  const [timerState, setTimerState] = useState<ActiveTimerState | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [futureNoteInput, setFutureNoteInput] = useState('');

  const bottomPadding = 80 + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

  const loadData = useCallback(() => {
    const pts = PlaythroughRepository.getContinuePlaying();
    const mapped: ContinueGameItem[] = [];

    for (const pt of pts) {
      const g = GameRepository.getById(pt.gameId);
      if (g) {
        mapped.push({ game: g, playthrough: pt });
      }
    }
    setActiveItems(mapped);
    setTimerState(getActiveTimer());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Timer interval to tick every second when running
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getActiveTimer();
      setTimerState(current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartTimer = (playthroughId: string) => {
    const state = startTimer(playthroughId);
    setTimerState(state);
  };

  const handlePauseTimer = () => {
    const state = pauseTimer();
    setTimerState(state);
  };

  const handleStopTimer = () => {
    if (!timerState) return;

    if (timerState.isSuspiciousDuration) {
      Alert.alert(
        'Tempo muito longo detectado',
        'Este cronômetro parece ter ficado aberto por mais de 12 horas. Deseja descartar ou registrar apenas uma fração?',
        [
          { text: 'Descartar', style: 'destructive', onPress: () => { clearTimer(); setTimerState(null); } },
          {
            text: 'Salvar 2 horas',
            onPress: () => {
              // Custom safe save
              stopAndSaveTimer('Sessão longa ajustada');
              setTimerState(null);
              loadData();
            },
          },
        ]
      );
      return;
    }

    Alert.prompt
      ? Alert.prompt('Finalizar Sessão', 'O que você conquistou nesta sessão?', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salvar',
            onPress: (note) => {
              stopAndSaveTimer(note);
              setTimerState(null);
              loadData();
            },
          },
        ])
      : (() => {
          stopAndSaveTimer('Sessão registrada');
          setTimerState(null);
          loadData();
        })();
  };

  const handleSaveFutureNote = (pt: Playthrough) => {
    const updated: Playthrough = {
      ...pt,
      noteToFutureSelf: futureNoteInput,
      updatedAt: new Date().toISOString(),
    };
    PlaythroughRepository.upsert(updated);
    setEditingNoteId(null);
    loadData();
  };

  const primaryItem = activeItems[0];
  const otherItems = activeItems.slice(1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      {/* Active Timer Floating Card */}
      {timerState && (
        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <View style={styles.timerIndicator} />
            <Text style={styles.timerTitle}>Cronômetro de Sessão Ativo</Text>
          </View>
          <Text style={styles.timerDigits}>
            {formatSecondsToTimerString(timerState.totalElapsedSeconds)}
          </Text>
          {timerState.isSuspiciousDuration && (
            <Text style={styles.timerWarning}>
              Atenção: cronômetro rodando há mais de 12 horas.
            </Text>
          )}
          <View style={styles.timerControls}>
            {timerState.isRunning ? (
              <TouchableOpacity style={styles.timerBtnPause} onPress={handlePauseTimer}>
                <Ionicons name="pause" size={18} color="#FFF" />
                <Text style={styles.timerBtnText}>Pausar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.timerBtnResume}
                onPress={() => handleStartTimer(timerState.playthroughId)}
              >
                <Ionicons name="play" size={18} color="#FFF" />
                <Text style={styles.timerBtnText}>Continuar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.timerBtnStop} onPress={handleStopTimer}>
              <Ionicons name="stop" size={18} color="#FFF" />
              <Text style={styles.timerBtnText}>Salvar Sessão</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timerBtnClear}
              onPress={() => {
                clearTimer();
                setTimerState(null);
              }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Focus: Continuar Jogando */}
      {primaryItem ? (
        <View style={styles.primaryGameCard}>
          <View style={styles.gameHeroRow}>
            {primaryItem.game.coverUrl ? (
              <Image source={{ uri: primaryItem.game.coverUrl }} style={styles.heroCover} />
            ) : (
              <View style={styles.heroCoverPlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.dark.textMuted} />
              </View>
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {primaryItem.game.title}
              </Text>
              <Text style={styles.heroStatus}>
                {primaryItem.playthrough.status === 'playing' ? '🔥 Em Andamento' : '⏸️ Pausado'}
              </Text>
              <Text style={styles.heroTime}>
                Tempo total:{' '}
                {Math.floor(primaryItem.playthrough.totalPlaytimeMinutes / 60)}h{' '}
                {primaryItem.playthrough.totalPlaytimeMinutes % 60}m
              </Text>
            </View>
          </View>

          {/* Objective & Chapter */}
          <View style={styles.progressBox}>
            <View style={styles.progressRow}>
              <Ionicons name="flag-outline" size={16} color={colors.dark.accent} />
              <Text style={styles.progressLabel}>Capítulo / Missão:</Text>
            </View>
            <Text style={styles.progressValue}>
              {primaryItem.playthrough.currentChapter || 'Não especificado (toque para definir)'}
            </Text>

            <View style={[styles.progressRow, { marginTop: 10 }]}>
              <Ionicons name="navigate-outline" size={16} color={colors.dark.primary} />
              <Text style={styles.progressLabel}>Próximo Objetivo:</Text>
            </View>
            <Text style={styles.progressValue}>
              {primaryItem.playthrough.nextObjective || 'Qual é o seu próximo passo na história?'}
            </Text>
          </View>

          {/* Note to Future Self */}
          <View style={styles.noteBox}>
            <View style={styles.progressRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.dark.accent} />
              <Text style={styles.progressLabel}>Nota para o Meu Eu do Futuro:</Text>
            </View>
            {editingNoteId === primaryItem.playthrough.id ? (
              <View style={{ marginTop: 8 }}>
                <TextInput
                  style={styles.noteInput}
                  multiline
                  value={futureNoteInput}
                  onChangeText={setFutureNoteInput}
                  placeholder="Ex: Peguei a chave dourada, ir para a torre leste..."
                  placeholderTextColor={colors.dark.textMuted}
                />
                <View style={styles.noteActionsRow}>
                  <TouchableOpacity
                    style={styles.noteSaveBtn}
                    onPress={() => handleSaveFutureNote(primaryItem.playthrough)}
                  >
                    <Text style={styles.noteBtnText}>Salvar Nota</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.noteCancelBtn}
                    onPress={() => setEditingNoteId(null)}
                  >
                    <Text style={[styles.noteBtnText, { color: colors.dark.textMuted }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setEditingNoteId(primaryItem.playthrough.id);
                  setFutureNoteInput(primaryItem.playthrough.noteToFutureSelf || '');
                }}
              >
                <Text style={styles.noteValue}>
                  {primaryItem.playthrough.noteToFutureSelf ||
                    'Escreva onde parou para lembrar quando voltar ao jogo...'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Actions */}
          <View style={styles.primaryActionsRow}>
            {(!timerState || timerState.playthroughId !== primaryItem.playthrough.id) && (
              <TouchableOpacity
                style={styles.actionBtnTimer}
                onPress={() => handleStartTimer(primaryItem.playthrough.id)}
              >
                <Ionicons name="stopwatch-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Iniciar Timer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionBtnDetails}
              onPress={() => router.push(`/playthrough/${primaryItem.playthrough.id}`)}
            >
              <Ionicons name="list-outline" size={18} color={colors.dark.text} />
              <Text style={[styles.actionBtnText, { color: colors.dark.text }]}>
                Checklists & Notas
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.noActiveCard}>
          <Ionicons name="game-controller-outline" size={48} color={colors.dark.textMuted} />
          <Text style={styles.noActiveTitle}>Nenhum jogo em andamento</Text>
          <Text style={styles.noActiveSub}>
            Escolha um jogo na sua biblioteca para começar ou continuar sua próxima aventura!
          </Text>
          <TouchableOpacity
            style={styles.chooseGameBtn}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.chooseGameBtnText}>Ir para Biblioteca</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Other Active or Paused Campaigns */}
      {otherItems.length > 0 && (
        <View style={styles.otherSection}>
          <Text style={styles.sectionTitle}>Outros Jogos em Andamento</Text>
          {otherItems.map(({ game, playthrough }) => (
            <TouchableOpacity
              key={playthrough.id}
              style={styles.otherCard}
              onPress={() => router.push(`/playthrough/${playthrough.id}`)}
            >
              {game.coverUrl ? (
                <Image source={{ uri: game.coverUrl }} style={styles.otherCover} />
              ) : (
                <View style={styles.otherCoverPlaceholder}>
                  <Ionicons name="image-outline" size={20} color={colors.dark.textMuted} />
                </View>
              )}
              <View style={styles.otherInfo}>
                <Text style={styles.otherTitle} numberOfLines={1}>
                  {game.title}
                </Text>
                <Text style={styles.otherSub} numberOfLines={1}>
                  {playthrough.currentChapter || 'Em progresso'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
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
  timerCard: {
    backgroundColor: '#271914',
    borderColor: colors.dark.primary,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.primary,
  },
  timerTitle: {
    color: colors.dark.primary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerDigits: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
  },
  timerWarning: {
    color: colors.dark.warning,
    fontSize: 12,
    marginBottom: 8,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  timerBtnPause: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dark.warning,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  timerBtnResume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dark.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  timerBtnStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  timerBtnClear: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  timerBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  primaryGameCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  gameHeroRow: {
    flexDirection: 'row',
    gap: 14,
  },
  heroCover: {
    width: 90,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
  },
  heroCoverPlaceholder: {
    width: 90,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  heroTitle: {
    color: colors.dark.text,
    fontSize: 20,
    fontWeight: '800',
  },
  heroStatus: {
    color: colors.dark.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  heroTime: {
    color: colors.dark.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  progressBox: {
    backgroundColor: colors.dark.inputBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  progressValue: {
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  noteBox: {
    backgroundColor: '#1E1E24',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.dark.accent,
  },
  noteValue: {
    color: colors.dark.text,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 20,
  },
  noteInput: {
    backgroundColor: colors.dark.inputBg,
    color: colors.dark.text,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  noteActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  noteSaveBtn: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  noteCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  noteBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtnTimer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.dark.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionBtnDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.dark.cardBorder,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  noActiveCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  noActiveTitle: {
    color: colors.dark.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  noActiveSub: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  chooseGameBtn: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  chooseGameBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  otherSection: {
    marginTop: 8,
    gap: 10,
  },
  sectionTitle: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  otherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  otherCover: {
    width: 44,
    height: 58,
    borderRadius: 4,
    backgroundColor: colors.dark.inputBg,
  },
  otherCoverPlaceholder: {
    width: 44,
    height: 58,
    borderRadius: 4,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherInfo: {
    flex: 1,
    marginLeft: 12,
  },
  otherTitle: {
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: '700',
  },
  otherSub: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
