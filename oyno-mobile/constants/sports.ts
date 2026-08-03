import { SportId } from '@/types';

export interface SportOption {
  id: SportId;
  label: string;
  emoji: string;
}

export const SPORT_OPTIONS: SportOption[] = [
  { id: 'all', label: 'Все', emoji: '✨' },
  { id: 'football', label: 'Футбол', emoji: '⚽' },
  { id: 'volleyball', label: 'Волейбол', emoji: '🏐' },
  { id: 'basketball', label: 'Баскетбол', emoji: '🏀' },
  { id: 'tennis', label: 'Теннис', emoji: '🎾' },
  { id: 'swimming', label: 'Плавание', emoji: '🏊' },
];

export const SPORT_LABELS: Record<Exclude<SportId, 'all'>, string> = {
  football: 'Футбол',
  basketball: 'Баскетбол',
  volleyball: 'Волейбол',
  tennis: 'Теннис',
  swimming: 'Плавание',
  other: 'Другое',
};

export function getSportLabel(sportId: SportId): string {
  return sportId === 'all' ? 'Спорт' : SPORT_LABELS[sportId];
}
