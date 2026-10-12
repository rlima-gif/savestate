import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DeviceRecord, DeviceKind } from '@savestate/shared';
import { DeviceRepository } from '../../db/repositories/device-repo';
import { colors } from '../../theme/colors';

export default function DeviceEditModal() {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);

  // Add form state
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DeviceKind>('steam_deck');
  const [graphicsPreset, setGraphicsPreset] = useState('');
  const [resolution, setResolution] = useState('');
  const [fpsTarget, setFpsTarget] = useState('60');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = () => {
    setDevices(DeviceRepository.getAll());
  };

  const handleAddDevice = () => {
    if (!name.trim()) {
      Alert.alert('Nome Obrigatório', 'Informe o nome do seu dispositivo (ex: Steam Deck OLED).');
      return;
    }

    const newDevice: DeviceRecord = {
      id: `dev-${Date.now()}`,
      name: name.trim(),
      kind,
      graphicsPreset: graphicsPreset.trim() || undefined,
      resolution: resolution.trim() || undefined,
      fpsTarget: parseInt(fpsTarget, 10) || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    DeviceRepository.upsert(newDevice);
    loadDevices();
    setName('');
    setGraphicsPreset('');
    setResolution('');
    setNotes('');
  };

  const handleDeleteDevice = (devId: string) => {
    DeviceRepository.delete(devId);
    loadDevices();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.modalTitle}>Configurações de Hardware & Dispositivos</Text>
      <Text style={styles.subTitle}>
        Mantenha anotações pessoais de presets gráficos, emuladores e locais de saves para cada um dos seus aparelhos.
      </Text>

      {/* Form to Add */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Adicionar Dispositivo</Text>

        <Text style={styles.label}>Nome do Dispositivo *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Steam Deck OLED, Legion Go, PC Principal"
          placeholderTextColor={colors.dark.textMuted}
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Tipo de Aparelho</Text>
        <View style={styles.chipsRow}>
          {(['steam_deck', 'pc', 'legion_go', 'android', 'retro_handheld', 'console'] as DeviceKind[]).map(
            (k) => {
              const isSelected = kind === k;
              const labels = {
                steam_deck: 'Steam Deck',
                pc: 'PC Gamer',
                legion_go: 'Legion Go',
                android: 'Celular Android',
                retro_handheld: 'Portátil Retrô',
                console: 'Console',
                other: 'Outro',
              };
              return (
                <TouchableOpacity
                  key={k}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setKind(k)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {labels[k]}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Preset Gráfico / Resolução</Text>
        <TextInput
          style={styles.input}
          value={graphicsPreset}
          onChangeText={setGraphicsPreset}
          placeholder="Ex: Médio com FSR Qualidade, 800p"
          placeholderTextColor={colors.dark.textMuted}
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Anotações de Saves / Emulador / Mods</Text>
        <TextInput
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Ex: Save fica em ~/.local/share/... ou Proton Experimental necessário"
          placeholderTextColor={colors.dark.textMuted}
        />

        <TouchableOpacity style={styles.addBtn} onPress={handleAddDevice}>
          <Text style={styles.addBtnText}>+ Salvar Dispositivo</Text>
        </TouchableOpacity>
      </View>

      {/* Existing Devices List */}
      <Text style={styles.sectionHeader}>Meus Dispositivos Cadastrados ({devices.length})</Text>
      {devices.map((dev) => (
        <View key={dev.id} style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.dark.primary} />
            <Text style={styles.deviceName}>{dev.name}</Text>
            <TouchableOpacity
              onPress={() => handleDeleteDevice(dev.id)}
              style={styles.deleteDevBtn}
            >
              <Ionicons name="trash-outline" size={18} color={colors.dark.danger} />
            </TouchableOpacity>
          </View>
          {dev.graphicsPreset && (
            <Text style={styles.deviceSub}>Preset: {dev.graphicsPreset}</Text>
          )}
          {dev.notes && <Text style={styles.deviceNotes}>{dev.notes}</Text>}
        </View>
      ))}

      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeBtnText}>Fechar</Text>
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
    gap: 14,
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
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 6,
  },
  cardHeader: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  label: {
    color: colors.dark.textSecondary,
    fontSize: 12,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  chipText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 4,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  deleteDevBtn: {
    padding: 4,
  },
  deviceSub: {
    color: colors.dark.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  deviceNotes: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  closeBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginTop: 10,
  },
  closeBtnText: {
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
