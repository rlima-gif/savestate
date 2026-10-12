import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CanonicalGame, Playthrough, PlaythroughStatus, OwnershipType } from '@savestate/shared';
import { GameRepository } from '../../db/repositories/game-repo';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import { ImageService } from '../../services/image-picker';
import { colors } from '../../theme/colors';

export default function AddGameModal() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [platformsInput, setPlatformsInput] = useState('PC, Steam');
  const [genresInput, setGenresInput] = useState('Ação, RPG');
  const [coverUrl, setCoverUrl] = useState('');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('digital');
  const [initialStatus, setInitialStatus] = useState<PlaythroughStatus>('backlog');

  const handlePickCover = async () => {
    try {
      const res = await ImageService.pickFromGallery();
      if (res) {
        setCoverUrl(res.uri);
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o título do jogo.');
      return;
    }

    const gameId = `manual-${Date.now()}`;
    const platforms = platformsInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const genres = genresInput
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    const newGame: CanonicalGame = {
      id: gameId,
      title: title.trim(),
      platforms: platforms.length > 0 ? platforms : ['PC'],
      genres: genres.length > 0 ? genres : ['Ação'],
      coverUrl: coverUrl.trim() || undefined,
      source: 'manual',
      externalIds: {},
      fetchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    GameRepository.upsert(newGame);

    // Create owned copy
    GameRepository.upsertCopy({
      id: `copy-${Date.now()}`,
      gameId,
      platform: platforms[0] || 'PC',
      ownershipType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create initial playthrough
    PlaythroughRepository.upsert({
      id: `pt-${Date.now()}`,
      gameId,
      status: initialStatus,
      priority: 'medium',
      isReplay: false,
      totalPlaytimeMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.modalTitle}>Cadastro Manual de Jogo</Text>

      {/* Title */}
      <Text style={styles.label}>Título do Jogo *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Metroid Prime Remastered"
        placeholderTextColor={colors.dark.textMuted}
      />

      {/* Cover */}
      <Text style={[styles.label, { marginTop: 12 }]}>Capa do Jogo (URL ou Foto)</Text>
      <View style={styles.coverRow}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.coverPreview} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="image-outline" size={24} color={colors.dark.textMuted} />
          </View>
        )}
        <View style={styles.coverInputContainer}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={coverUrl}
            onChangeText={setCoverUrl}
            placeholder="Cole o link da imagem..."
            placeholderTextColor={colors.dark.textMuted}
          />
          <TouchableOpacity style={styles.pickCoverBtn} onPress={handlePickCover}>
            <Ionicons name="folder-open-outline" size={16} color="#FFF" />
            <Text style={styles.pickCoverText}>Galeria</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Platforms */}
      <Text style={[styles.label, { marginTop: 12 }]}>Plataformas (separadas por vírgula)</Text>
      <TextInput
        style={styles.input}
        value={platformsInput}
        onChangeText={setPlatformsInput}
        placeholder="Ex: Nintendo Switch, PC, PS5"
        placeholderTextColor={colors.dark.textMuted}
      />

      {/* Genres */}
      <Text style={[styles.label, { marginTop: 12 }]}>Gêneros (separados por vírgula)</Text>
      <TextInput
        style={styles.input}
        value={genresInput}
        onChangeText={setGenresInput}
        placeholder="Ex: Metroidvania, Ficção Científica"
        placeholderTextColor={colors.dark.textMuted}
      />

      {/* Ownership Type */}
      <Text style={[styles.label, { marginTop: 12 }]}>Tipo de Posse</Text>
      <View style={styles.chipsRow}>
        {(['digital', 'physical', 'subscription', 'borrowed'] as OwnershipType[]).map((type) => {
          const isSelected = ownershipType === type;
          const labels = {
            digital: 'Digital',
            physical: 'Mídia Física',
            subscription: 'Assinatura',
            borrowed: 'Emprestado',
            other: 'Outro',
          };
          return (
            <TouchableOpacity
              key={type}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => setOwnershipType(type)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {labels[type]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Status */}
      <Text style={[styles.label, { marginTop: 12 }]}>Status Inicial</Text>
      <View style={styles.chipsRow}>
        {(['backlog', 'playing', 'paused', 'beaten'] as PlaythroughStatus[]).map((st) => {
          const isSelected = initialStatus === st;
          const labels = {
            backlog: 'Backlog',
            playing: 'Jogando',
            paused: 'Pausado',
            beaten: 'Zerado',
          };
          return (
            <TouchableOpacity
              key={st}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => setInitialStatus(st)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {labels[st as keyof typeof labels]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Adicionar à Biblioteca</Text>
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
    gap: 8,
  },
  modalTitle: {
    color: colors.dark.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
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
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  coverRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  coverPreview: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
  },
  coverPlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInputContainer: {
    flex: 1,
    gap: 8,
  },
  pickCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pickCoverText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 24,
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
