import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanonicalGame, PlaythroughStatus, OwnershipType } from '@savestate/shared';
import { GameRepository } from '../../db/repositories/game-repo';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import { ImageService } from '../../services/image-picker';
import { colors } from '../../theme/colors';

export default function AddGameModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ initialTitle?: string }>();

  const [title, setTitle] = useState('');
  const [platformsInput, setPlatformsInput] = useState('PC');
  const [genresInput, setGenresInput] = useState('Ação');
  const [coverUrl, setCoverUrl] = useState('');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('digital');
  const [initialStatus, setInitialStatus] = useState<PlaythroughStatus>('backlog');

  useEffect(() => {
    if (params.initialTitle) {
      try {
        setTitle(decodeURIComponent(params.initialTitle));
      } catch {
        setTitle(params.initialTitle);
      }
    }
  }, [params.initialTitle]);

  const handlePickCover = async () => {
    try {
      const res = await ImageService.pickFromGallery();
      if (res && res.uri) {
        setCoverUrl(res.uri);
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao selecionar imagem da galeria.');
    }
  };

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
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
      title: cleanTitle,
      platforms: platforms.length > 0 ? platforms : ['PC'],
      genres: genres.length > 0 ? genres : ['Geral'],
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

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16);

  return (
    <KeyboardAvoidingView
      style={styles.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.modalTitle}>Novo Jogo na Coleção</Text>
        <Text style={styles.modalSub}>
          Cadastre seu jogo com capa e status. Seus dados ficam salvos 100% offline no dispositivo.
        </Text>

        {/* Title */}
        <Text style={styles.label}>Título do Jogo *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Metroid Prime Remastered, Chrono Trigger..."
          placeholderTextColor={colors.dark.textMuted}
          autoFocus={!params.initialTitle}
        />

        {/* Cover */}
        <Text style={[styles.label, { marginTop: 14 }]}>Capa do Jogo</Text>
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
              style={styles.inputSmall}
              value={coverUrl}
              onChangeText={setCoverUrl}
              placeholder="Cole o link da capa (URL)..."
              placeholderTextColor={colors.dark.textMuted}
            />
            <TouchableOpacity style={styles.pickCoverBtn} onPress={handlePickCover} activeOpacity={0.8}>
              <Ionicons name="folder-open" size={16} color={colors.dark.accent} />
              <Text style={styles.pickCoverText}>Escolher da Galeria</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Platforms */}
        <Text style={[styles.label, { marginTop: 14 }]}>Plataformas (separadas por vírgula)</Text>
        <TextInput
          style={styles.input}
          value={platformsInput}
          onChangeText={setPlatformsInput}
          placeholder="Ex: PC, Nintendo Switch, PS5, Steam Deck..."
          placeholderTextColor={colors.dark.textMuted}
        />

        {/* Genres */}
        <Text style={[styles.label, { marginTop: 14 }]}>Gêneros</Text>
        <TextInput
          style={styles.input}
          value={genresInput}
          onChangeText={setGenresInput}
          placeholder="Ex: Metroidvania, RPG, Roguelike, Soulslike..."
          placeholderTextColor={colors.dark.textMuted}
        />

        {/* Ownership Type */}
        <Text style={[styles.label, { marginTop: 14 }]}>Tipo de Posse</Text>
        <View style={styles.chipsRow}>
          {(['digital', 'physical', 'subscription', 'borrowed'] as OwnershipType[]).map((type) => {
            const isSelected = ownershipType === type;
            const labels: Record<string, string> = {
              digital: 'Digital',
              physical: 'Mídia Física',
              subscription: 'Assinatura / Game Pass',
              borrowed: 'Emprestado',
            };
            return (
              <TouchableOpacity
                key={type}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setOwnershipType(type)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {labels[type] || type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Status */}
        <Text style={[styles.label, { marginTop: 14 }]}>Status Inicial</Text>
        <View style={styles.chipsRow}>
          {(['backlog', 'playing', 'paused', 'beaten'] as PlaythroughStatus[]).map((st) => {
            const isSelected = initialStatus === st;
            const labels: Record<string, string> = {
              backlog: 'Backlog',
              playing: 'Jogando Agora',
              paused: 'Pausado',
              beaten: 'Zerado',
            };
            return (
              <TouchableOpacity
                key={st}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setInitialStatus(st)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {labels[st] || st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>Salvar na Minha Coleção</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    padding: 20,
    gap: 6,
  },
  modalTitle: {
    color: colors.dark.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  modalSub: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  label: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.dark.inputBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.dark.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  inputSmall: {
    backgroundColor: colors.dark.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.dark.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
  },
  coverRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  coverPreview: {
    width: 64,
    height: 88,
    borderRadius: 8,
    backgroundColor: colors.dark.surface,
  },
  coverPlaceholder: {
    width: 64,
    height: 88,
    borderRadius: 8,
    backgroundColor: colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
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
    borderColor: colors.dark.cardBorder,
    paddingVertical: 9,
    borderRadius: 8,
  },
  pickCoverText: {
    color: colors.dark.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.cardBorder,
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
    fontWeight: '800',
  },
  actionsRow: {
    marginTop: 28,
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
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
