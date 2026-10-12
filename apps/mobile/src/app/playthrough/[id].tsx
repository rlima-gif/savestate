import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Playthrough, CanonicalGame, ChecklistItem, ChecklistCategory, Session } from '@savestate/shared';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import { GameRepository } from '../../db/repositories/game-repo';
import { ChecklistRepository } from '../../db/repositories/checklist-repo';
import { SessionRepository } from '../../db/repositories/session-repo';
import { colors } from '../../theme/colors';

export default function PlaythroughDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [playthrough, setPlaythrough] = useState<Playthrough | null>(null);
  const [game, setGame] = useState<CanonicalGame | null>(null);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Editing state
  const [chapter, setChapter] = useState('');
  const [objective, setObjective] = useState('');
  const [futureNote, setFutureNote] = useState('');

  // Add checklist item state
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState<ChecklistCategory>('goal');
  const [isMissable, setIsMissable] = useState(false);
  const [pointOfNoReturn, setPointOfNoReturn] = useState('');

  const loadData = useCallback(() => {
    if (!id) return;
    const pt = PlaythroughRepository.getById(id);
    setPlaythrough(pt);
    if (pt) {
      const g = GameRepository.getById(pt.gameId);
      setGame(g);
      setChapter(pt.currentChapter || '');
      setObjective(pt.nextObjective || '');
      setFutureNote(pt.noteToFutureSelf || '');
      setChecklists(ChecklistRepository.getByPlaythroughId(pt.id));
      setSessions(SessionRepository.getByPlaythroughId(pt.id));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (!playthrough || !game) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>Campanha não encontrada</Text>
      </View>
    );
  }

  const handleSaveProgressDetails = () => {
    const updated: Playthrough = {
      ...playthrough,
      currentChapter: chapter,
      nextObjective: objective,
      noteToFutureSelf: futureNote,
      updatedAt: new Date().toISOString(),
    };
    PlaythroughRepository.upsert(updated);
    setPlaythrough(updated);
    Alert.alert('Salvo', 'Progresso atualizado com sucesso!');
  };

  const handleToggleChecklist = (item: ChecklistItem) => {
    ChecklistRepository.toggleComplete(item.id, !item.isCompleted);
    setChecklists((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, isCompleted: !c.isCompleted } : c))
    );
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistTitle.trim()) return;
    const newItem: ChecklistItem = {
      id: `check-${Date.now()}`,
      playthroughId: playthrough.id,
      title: newChecklistTitle.trim(),
      category: newChecklistCategory,
      isCompleted: false,
      isMissable,
      pointOfNoReturn: isMissable ? pointOfNoReturn : undefined,
      isSpoiler: false,
      orderIndex: checklists.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ChecklistRepository.upsert(newItem);
    setChecklists((prev) => [...prev, newItem]);
    setNewChecklistTitle('');
    setIsMissable(false);
    setPointOfNoReturn('');
  };

  const handleDeleteChecklistItem = (checkId: string) => {
    ChecklistRepository.delete(checkId);
    setChecklists((prev) => prev.filter((c) => c.id !== checkId));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Campaign Header */}
      <View style={styles.card}>
        <Text style={styles.gameTitle}>{game.title}</Text>
        <Text style={styles.playtimeText}>
          Tempo Jogado: {Math.floor(playthrough.totalPlaytimeMinutes / 60)}h{' '}
          {playthrough.totalPlaytimeMinutes % 60}m
        </Text>
      </View>

      {/* Progress & Chapter Editor */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Progresso Atual</Text>

        <Text style={styles.inputLabel}>Capítulo ou Missão Atual:</Text>
        <TextInput
          style={styles.textInput}
          value={chapter}
          onChangeText={setChapter}
          placeholder="Ex: Capítulo 4 - As Catacumbas"
          placeholderTextColor={colors.dark.textMuted}
        />

        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Próximo Objetivo Imediato:</Text>
        <TextInput
          style={styles.textInput}
          value={objective}
          onChangeText={setObjective}
          placeholder="Ex: Encontrar a tocha e voltar ao portão sul"
          placeholderTextColor={colors.dark.textMuted}
        />

        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Nota para o Meu Eu do Futuro:</Text>
        <TextInput
          style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
          value={futureNote}
          onChangeText={setFutureNote}
          placeholder="Onde você parou? O que estava planejando fazer na próxima sessão?"
          placeholderTextColor={colors.dark.textMuted}
          multiline
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProgressDetails}>
          <Text style={styles.saveBtnText}>Salvar Progresso</Text>
        </TouchableOpacity>
      </View>

      {/* Checklists Section */}
      <View style={styles.card}>
        <View style={styles.headerWithAction}>
          <Text style={styles.cardHeader}>Checklist Pessoal & Metas</Text>
        </View>

        {checklists.map((item) => (
          <View key={item.id} style={styles.checkItemRow}>
            <TouchableOpacity
              style={styles.checkToggle}
              onPress={() => handleToggleChecklist(item)}
            >
              <Ionicons
                name={item.isCompleted ? 'checkbox' : 'square-outline'}
                size={22}
                color={item.isCompleted ? colors.dark.success : colors.dark.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.checkContent}>
              <Text
                style={[
                  styles.checkTitle,
                  item.isCompleted && styles.checkTitleCompleted,
                ]}
              >
                {item.title}
              </Text>
              {item.isMissable && (
                <View style={styles.missableBadge}>
                  <Ionicons name="warning-outline" size={12} color={colors.dark.warning} />
                  <Text style={styles.missableText}>
                    Perdível! {item.pointOfNoReturn ? `(${item.pointOfNoReturn})` : ''}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteChecklistItem(item.id)}
              style={styles.deleteCheckBtn}
            >
              <Ionicons name="close" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Checklist Input */}
        <View style={styles.addChecklistContainer}>
          <TextInput
            style={styles.textInput}
            value={newChecklistTitle}
            onChangeText={setNewChecklistTitle}
            placeholder="Nova meta (ex: Derrotar chefe opcional, pegar mapa)..."
            placeholderTextColor={colors.dark.textMuted}
          />
          <View style={styles.addCheckOptionsRow}>
            <TouchableOpacity
              style={[styles.missableToggle, isMissable && styles.missableToggleActive]}
              onPress={() => setIsMissable(!isMissable)}
            >
              <Ionicons
                name={isMissable ? 'warning' : 'warning-outline'}
                size={14}
                color={isMissable ? '#FFF' : colors.dark.warning}
              />
              <Text style={[styles.missableToggleText, isMissable && { color: '#FFF' }]}>
                Conteúdo Perdível?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addCheckBtn} onPress={handleAddChecklistItem}>
              <Text style={styles.addCheckBtnText}>+ Adicionar Meta</Text>
            </TouchableOpacity>
          </View>

          {isMissable && (
            <TextInput
              style={[styles.textInput, { marginTop: 8 }]}
              value={pointOfNoReturn}
              onChangeText={setPointOfNoReturn}
              placeholder="Ponto de não retorno (ex: Antes do elevador no Cap. 5)"
              placeholderTextColor={colors.dark.textMuted}
            />
          )}
        </View>
      </View>

      {/* Sessions History */}
      <View style={styles.card}>
        <View style={styles.headerWithAction}>
          <Text style={styles.cardHeader}>Histórico de Sessões ({sessions.length})</Text>
          <TouchableOpacity
            style={styles.addSessionBtn}
            onPress={() => router.push(`/modal/session-edit?playthroughId=${playthrough.id}`)}
          >
            <Ionicons name="time-outline" size={16} color="#FFF" />
            <Text style={styles.addSessionBtnText}>+ Registrar Tempo</Text>
          </TouchableOpacity>
        </View>

        {sessions.length === 0 ? (
          <Text style={styles.emptySessionsText}>
            Nenhuma sessão registrada. Use o cronômetro na aba 'Jogando' ou adicione tempo manual
            acima.
          </Text>
        ) : (
          sessions.map((sess) => (
            <View key={sess.id} style={styles.sessionRow}>
              <View style={styles.sessionTimeBadge}>
                <Text style={styles.sessionTimeText}>{sess.durationMinutes} min</Text>
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionDate}>
                  {new Date(sess.startTime).toLocaleDateString('pt-BR')}
                </Text>
                <Text style={styles.sessionNote}>{sess.progressNote || 'Sem anotações'}</Text>
              </View>
            </View>
          ))
        )}
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
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  gameTitle: {
    color: colors.dark.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  playtimeText: {
    color: colors.dark.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  cardHeader: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  headerWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.dark.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.dark.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  saveBtn: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  checkToggle: {
    marginRight: 10,
  },
  checkContent: {
    flex: 1,
  },
  checkTitle: {
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  checkTitleCompleted: {
    color: colors.dark.textMuted,
    textDecorationLine: 'line-through',
  },
  missableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  missableText: {
    color: colors.dark.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  deleteCheckBtn: {
    padding: 6,
  },
  addChecklistContainer: {
    marginTop: 14,
    gap: 8,
  },
  addCheckOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  missableToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
    borderWidth: 1,
    borderColor: colors.dark.warning,
  },
  missableToggleActive: {
    backgroundColor: colors.dark.warning,
  },
  missableToggleText: {
    color: colors.dark.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  addCheckBtn: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addCheckBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dark.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addSessionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptySessionsText: {
    color: colors.dark.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    gap: 12,
  },
  sessionTimeBadge: {
    backgroundColor: colors.dark.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionTimeText: {
    color: colors.dark.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    color: colors.dark.textSecondary,
    fontSize: 12,
  },
  sessionNote: {
    color: colors.dark.text,
    fontSize: 13,
    marginTop: 2,
  },
});
