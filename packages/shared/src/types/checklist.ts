export type ChecklistCategory =
  | 'quest'         // Missões secundárias
  | 'collectible'   // Colecionáveis
  | 'boss'          // Chefes opcionais
  | 'ending'        // Finais alternativos
  | 'achievement'   // Conquista oficial
  | 'goal';         // Meta pessoal antes de avançar

export interface ChecklistItem {
  id: string;
  playthroughId: string;
  title: string;
  description?: string;
  category: ChecklistCategory;
  isCompleted: boolean;
  isMissable: boolean;
  pointOfNoReturn?: string; // Ex: "Antes de entrar no portal no Capítulo 7"
  isSpoiler: boolean;
  source?: string;
  verificationDate?: string;
  orderIndex: number;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
