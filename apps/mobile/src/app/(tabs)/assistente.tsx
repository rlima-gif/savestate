import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AssistantMessage,
  HintTier,
  SpoilerLevel,
  CanonicalGame,
  Playthrough,
} from '@savestate/shared';
import { ApiService } from '../../services/api';
import { isKiloAssistantEnabled } from '../../services/kilo-assistant';
import { ImageService, PickedImageResult } from '../../services/image-picker';
import { GameRepository } from '../../db/repositories/game-repo';
import { PlaythroughRepository } from '../../db/repositories/playthrough-repo';
import { colors } from '../../theme/colors';

export default function AssistenteScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'E aí, jogador! Sou o SaveState Assistant.\n\nPrecisa de ajuda com algum puzzle, item, estratégia de chefe ou onde ir a seguir? Envie sua pergunta ou tire uma foto da sua tela!',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<PickedImageResult | null>(null);
  const [hintTier, setHintTier] = useState<HintTier>('small_hint');
  const [spoilerLevel, setSpoilerLevel] = useState<SpoilerLevel>('hints_only');
  const [isLoading, setIsLoading] = useState(false);

  // Active game context
  const [availableGames, setAvailableGames] = useState<Array<{ game: CanonicalGame; pt?: Playthrough }>>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const loadActiveGames = useCallback(() => {
    const games = GameRepository.getAll();
    const pts = PlaythroughRepository.getAll();
    const ptMap = new Map(pts.map((p) => [p.gameId, p]));

    const mapped = games.map((g) => ({ game: g, pt: ptMap.get(g.id) }));
    setAvailableGames(mapped);

    if (!selectedGameId && mapped.length > 0) {
      // Pick first playing game or first game
      const playing = mapped.find((m) => m.pt?.status === 'playing');
      setSelectedGameId(playing ? playing.game.id : mapped[0].game.id);
    }
  }, [selectedGameId]);

  useFocusEffect(
    useCallback(() => {
      loadActiveGames();
    }, [loadActiveGames])
  );

  const activeContext = availableGames.find((g) => g.game.id === selectedGameId);

  const handleTakePhoto = async () => {
    try {
      const res = await ImageService.takePhoto();
      if (res) setSelectedImage(res);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePickGallery = async () => {
    try {
      const res = await ImageService.pickFromGallery();
      if (res) setSelectedImage(res);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading) return;

    const userMsgText = inputText.trim() || 'O que você identifica nesta tela do jogo?';
    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMsgText,
      imageBase64: selectedImage?.base64,
      imageMimeType: selectedImage?.mimeType,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    const imagePayload = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const gameTitle = activeContext ? activeContext.game.title : 'Videogame Geral';
      const currentChapter = activeContext?.pt?.currentChapter;
      const currentObjective = activeContext?.pt?.nextObjective;
      const userNotes = activeContext?.pt?.notes;

      const response = await ApiService.askAssistant({
        message: userMsgText,
        context: {
          gameTitle,
          platform: activeContext?.pt?.ownedCopyId || undefined,
          currentChapter,
          currentObjective,
          userNotes,
          spoilerLevel,
          hintTier,
        },
        imageBase64: imagePayload?.base64,
        imageMimeType: imagePayload?.mimeType,
      });

      const assistantMsg: AssistantMessage = {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        hintTier: response.hintTier,
        isFallback: response.isFallback,
        externalSearchLinks: response.externalSearchLinks,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Ops, não consegui consultar o assistente: ${err.message}.\n\nSe estiver sem internet ou a cota esgotou, você ainda pode conferir guias externos abaixo:`,
        isFallback: true,
        externalSearchLinks: [
          {
            title: `Buscar no YouTube (${activeContext?.game.title || 'Jogo'})`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
              (activeContext?.game.title ? `${activeContext.game.title} detonado ` : 'detonado ') + userMsgText
            )}`,
            source: 'youtube',
          },
        ],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Context Selector Header */}
      <View style={styles.contextHeader}>
        <View style={styles.contextRow}>
          <Ionicons name="game-controller" size={16} color={colors.dark.accent} />
          <Text style={styles.contextLabel}>Jogo em Foco:</Text>
          <Text style={styles.contextGameTitle} numberOfLines={1}>
            {activeContext ? activeContext.game.title : 'Geral (Nenhum selecionado)'}
          </Text>
        </View>

        {/* Hint Tier Pills */}
        <View style={styles.tierSelectorRow}>
          <TouchableOpacity
            style={[styles.tierPill, hintTier === 'small_hint' && styles.tierPillActive]}
            onPress={() => setHintTier('small_hint')}
          >
            <Text
              style={[
                styles.tierPillText,
                hintTier === 'small_hint' && styles.tierPillTextActive,
              ]}
            >
              💡 Dica Leve
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tierPill, hintTier === 'detailed_hint' && styles.tierPillActive]}
            onPress={() => setHintTier('detailed_hint')}
          >
            <Text
              style={[
                styles.tierPillText,
                hintTier === 'detailed_hint' && styles.tierPillTextActive,
              ]}
            >
              🔍 Detalhada
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tierPill, hintTier === 'full_solution' && styles.tierPillActive]}
            onPress={() => setHintTier('full_solution')}
          >
            <Text
              style={[
                styles.tierPillText,
                hintTier === 'full_solution' && styles.tierPillTextActive,
              ]}
            >
              🏆 Solução
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {msg.imageBase64 && (
                <Image
                  source={{ uri: `data:${msg.imageMimeType || 'image/jpeg'};base64,${msg.imageBase64}` }}
                  style={styles.bubbleImage}
                />
              )}
              <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
                {msg.content}
              </Text>

              {/* External Guide Links */}
              {msg.externalSearchLinks && msg.externalSearchLinks.length > 0 && (
                <View style={styles.guidesContainer}>
                  <Text style={styles.guidesHeading}>Guias & Links Relacionados:</Text>
                  {msg.externalSearchLinks.map((link, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.guideLinkBtn}
                      onPress={() => Linking.openURL(link.url)}
                    >
                      <Ionicons name="open-outline" size={14} color={colors.dark.accent} />
                      <Text style={styles.guideLinkText} numberOfLines={1}>
                        {link.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {isLoading && (
          <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
            <ActivityIndicator size="small" color={colors.dark.primary} />
            <Text style={styles.loadingBubbleText}>SaveState Assistant está analisando...</Text>
          </View>
        )}
      </ScrollView>

      {/* Image Preview Thumbnail */}
      {selectedImage && (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: selectedImage.uri }} style={styles.previewThumb} />
          <View style={styles.previewDetails}>
            <Text style={styles.previewText}>Foto/Screenshot pronta para envio</Text>
            <TouchableOpacity onPress={() => setSelectedImage(null)}>
              <Text style={styles.previewRemove}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Input Area */}
      <View style={styles.inputArea}>
        <TouchableOpacity style={styles.mediaIconBtn} onPress={handleTakePhoto}>
          <Ionicons name="camera-outline" size={22} color={colors.dark.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.mediaIconBtn} onPress={handlePickGallery}>
          <Ionicons name="image-outline" size={22} color={colors.dark.text} />
        </TouchableOpacity>

        <TextInput
          style={styles.chatInput}
          placeholder="Pergunte sobre um item, puzzle, boss..."
          placeholderTextColor={colors.dark.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!inputText.trim() && !selectedImage) && styles.sendBtnDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() && !selectedImage}
        >
          <Ionicons name="arrow-up" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.aiPrivacyNote}>
        {isKiloAssistantEnabled()
          ? 'IA grátis experimental: texto e imagens vão à Kilo e ao modelo roteado. Evite dados privados.'
          : 'Mensagem e imagens são enviadas ao provedor de IA configurado no serviço.'}
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  contextHeader: {
    backgroundColor: colors.dark.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    gap: 8,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextLabel: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  contextGameTitle: {
    color: colors.dark.text,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  tierSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  tierPillActive: {
    backgroundColor: '#351F1A',
    borderColor: colors.dark.primary,
  },
  tierPillText: {
    color: colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  tierPillTextActive: {
    color: colors.dark.primary,
    fontWeight: '700',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.dark.primary,
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dark.card,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  bubbleText: {
    color: colors.dark.text,
    fontSize: 14,
    lineHeight: 21,
  },
  userBubbleText: {
    color: '#FFF',
    fontWeight: '500',
  },
  bubbleImage: {
    width: 200,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.dark.inputBg,
  },
  guidesContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    gap: 6,
  },
  guidesHeading: {
    color: colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  guideLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  guideLinkText: {
    color: colors.dark.accent,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingBubbleText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 10,
  },
  previewThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  previewDetails: {
    flex: 1,
  },
  previewText: {
    color: colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
  },
  previewRemove: {
    color: colors.dark.danger,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: colors.dark.card,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    gap: 8,
  },
  aiPrivacyNote: {
    color: colors.dark.textMuted,
    backgroundColor: colors.dark.card,
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 14,
    paddingBottom: 8,
    textAlign: 'center',
  },
  mediaIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.dark.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.dark.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.dark.text,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.dark.cardBorder,
    opacity: 0.5,
  },
});
