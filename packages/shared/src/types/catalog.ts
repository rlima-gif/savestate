export interface CatalogGameSummary {
  id: string; // provider prefixed or unique ID
  providerId: number;
  provider: 'rawg' | 'igdb' | 'mock';
  title: string;
  coverUrl?: string;
  releaseDate?: string;
  platforms: string[];
  genres: string[];
  rating?: number;
  metacritic?: number;
}

export interface CatalogGameDetails extends CatalogGameSummary {
  description: string;
  developers: string[];
  publishers: string[];
  website?: string;
  screenshots: string[];
  estimatedDurationHours?: {
    mainStory?: number;
    mainExtra?: number;
    completionist?: number;
  };
  attribution: string;
}

export interface CatalogSearchResponse {
  results: CatalogGameSummary[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  provider: 'rawg' | 'igdb' | 'mock';
  attribution: string;
}
