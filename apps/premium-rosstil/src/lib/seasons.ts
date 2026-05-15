import type { Season } from '@/generated/prisma'

/** Названия сезонов на русском */
export const SEASON_LABELS: Record<Season, string> = {
  SPRING_SUMMER: 'Весна-Лето',
  FALL_WINTER: 'Осень-Зима',
  CRUISE: 'Круизная',
  ALL_SEASON: 'Вне сезона',
}
