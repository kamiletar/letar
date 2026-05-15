'use client'

/**
 * GrandSlamCupForm — расширенный Form компонент для grandslamcup.
 *
 * Lazy-загрузка Select'ов для enum'ов (оптимизация памяти).
 *
 * @example
 * ```tsx
 * <GrandSlamCupForm schema={SeasonCreateFormSchema} initialValue={...} onSubmit={...}>
 *   <GrandSlamCupForm.Field.String name="name" />
 *   <GrandSlamCupForm.Select.SeasonStatus name="status" />
 *   <GrandSlamCupForm.Button.Submit>Создать</GrandSlamCupForm.Button.Submit>
 * </GrandSlamCupForm>
 * ```
 */

import { createForm } from '@letar/forms'

export const GrandSlamCupForm = createForm({
  lazySelects: {
    // Enum Select'ы
    SeasonStatus: () => import('./selects/select-season-status').then((m) => m.SelectSeasonStatus),
    MatchStatus: () => import('./selects/select-match-status').then((m) => m.SelectMatchStatus),
    PlayerRole: () => import('./selects/select-player-role').then((m) => m.SelectPlayerRole),
    TournamentFormat: () => import('./selects/select-tournament-format').then((m) => m.SelectTournamentFormat),
    // Entity Select'ы (с автозагрузкой данных)
    City: () => import('./selects/select-city').then((m) => m.SelectCity),
    Venue: () => import('./selects/select-venue').then((m) => m.SelectVenue),
  },
})
