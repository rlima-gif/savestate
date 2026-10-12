import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SessionRepository } from '../../db/repositories/session-repo';
import { colors } from '../../theme/colors';

export default function SessionEditModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + 24;
  const { playthroughId } = useLocalSearchParams<{ playthroughId: string }>();
  const [durationInput, setDurationInput] = useState('60');
  const [progressNote, setProgressNote] = useState('');

  const quickMinutes = [15, 30, 45, 60, 90, 120, 180];

  const handleSave = () => {
    const mins = parseInt(durationInput, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Tempo Inválido', 'Por favor, informe uma duração válida em minutos.');
      return;
    }
    if (!playthroughId) {
      Alert.alert('Erro', 'Campanha não encontrada.');
      return;
    }

    SessionRepository.create({
      id: `session-${Date.now()}`,
      playthroughId,
      startTime: new Date().toISOString(),
      durationMinutes: mins,
      progressNote: progressNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      <Text style={styles.modalTitle}>Registrar Tempo de Sessão</Text>
      <Text style={styles.subTitle}>
        Adicione manualmente o tempo que você jogou no console ou portátil.
      </Text>

      {/* Quick Select Chips */}
      <Text style={styles.label}>Escolha Rápida:</Text>
      <View style={styles.quickChipsRow}>
        {quickMinutes.map((mins) => {
          const isSelected = durationInput === String(mins);
          return (
            <TouchableOpacity
              key={mins}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => setDurationInput(String(mins))}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {mins} min
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Manual Input */}
      <Text style={[styles.label, { marginTop: 16 }]}>Duração Manual (minutos):</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={durationInput}
        onChangeText={setDurationInput}
      />

      {/* Progress Note */}
      <Text style={[styles.label, { marginTop: 16 }]}>Notas do Progresso da Sessão:</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        multiline
        value={progressNote}
        onChangeText={setProgressNote}
        placeholder="Ex: Derrotei o chefe do pântano e encontrei a chave enferrujada..."
        placeholderTextColor={colors.dark.textMuted}
      />

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Salvar Sessão</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
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
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    color: colors.dark.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subTitle: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  label: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipActive: {
    backgroundColor: colors.dark.accent,
    borderColor: colors.dark.accent,
  },
  chipText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.dark.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.dark.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionsRow: {
    marginTop: 20,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.dark.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
