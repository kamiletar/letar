/**
 * Double Elimination — генерация турнирной сетки.
 *
 * По правилам КБС-Москва 2026:
 * - 16 команд после швейцарки делятся: 1-12 → верхняя сетка, 13-16 → нижняя
 * - 1-4 места пропускают WB R1, начинают с WB R2
 * - Проигравшие в верхней → падают в нижнюю
 * - Проигравшие в нижней → вылетают
 * - Финал: чемпион WB vs чемпион LB
 */

/** Определение слота в сетке */
export interface BracketSlotDef {
  stageType: 'PLAYOFF_UPPER' | 'PLAYOFF_LOWER' | 'GRAND_FINAL'
  roundNumber: number
  slotNumber: number
  label: string
  /** Seed команды (если известен на старте, 1-16) */
  seed?: number
  /** Откуда приходит команда 1 (stageType:round:slot) */
  source1?: string
  /** Откуда приходит команда 2 */
  source2?: string
  /** Куда падает проигравший */
  loserGoesTo?: string
}

/**
 * Генерирует полную сетку Double Elimination для 16 команд.
 * Возвращает массив определений слотов для создания BracketSlot в БД.
 */
export function generateDE16Bracket(): BracketSlotDef[] {
  const slots: BracketSlotDef[] = []

  // === ВЕРХНЯЯ СЕТКА (Winners Bracket) ===

  // WB R1 (4 матча): 5vs12, 6vs11, 7vs10, 8vs9
  slots.push(
    { stageType: 'PLAYOFF_UPPER', roundNumber: 1, slotNumber: 1, label: 'WB R1 #1', seed: 5, source2: undefined },
    { stageType: 'PLAYOFF_UPPER', roundNumber: 1, slotNumber: 2, label: 'WB R1 #2', seed: 12 },
    { stageType: 'PLAYOFF_UPPER', roundNumber: 1, slotNumber: 3, label: 'WB R1 #3', seed: 6 },
    { stageType: 'PLAYOFF_UPPER', roundNumber: 1, slotNumber: 4, label: 'WB R1 #4', seed: 11 },
    { stageType: 'PLAYOFF_UPPER', roundNumber: 1, slotNumber: 5, label: 'WB R1 #5', seed: 7 },
    { stageType: 'PLAYOFF_UPPER', roundNumber: 1, slotNumber: 6, label: 'WB R1 #6', seed: 10 },
    { stageType: 'PLAYOFF_UPPER', roundNumber: 1, slotNumber: 7, label: 'WB R1 #7', seed: 8 },
    { stageType: 'PLAYOFF_UPPER', roundNumber: 1, slotNumber: 8, label: 'WB R1 #8', seed: 9 }
  )

  // WB R2 (4 матча): 1vs(поб 8/9), 2vs(поб 7/10), 3vs(поб 6/11), 4vs(поб 5/12)
  slots.push(
    {
      stageType: 'PLAYOFF_UPPER',
      roundNumber: 2,
      slotNumber: 1,
      label: 'WB R2 #1',
      seed: 1,
      source2: 'PLAYOFF_UPPER:1:7',
    },
    {
      stageType: 'PLAYOFF_UPPER',
      roundNumber: 2,
      slotNumber: 2,
      label: 'WB R2 #2',
      seed: 2,
      source2: 'PLAYOFF_UPPER:1:5',
    },
    {
      stageType: 'PLAYOFF_UPPER',
      roundNumber: 2,
      slotNumber: 3,
      label: 'WB R2 #3',
      seed: 3,
      source2: 'PLAYOFF_UPPER:1:3',
    },
    {
      stageType: 'PLAYOFF_UPPER',
      roundNumber: 2,
      slotNumber: 4,
      label: 'WB R2 #4',
      seed: 4,
      source2: 'PLAYOFF_UPPER:1:1',
    }
  )

  // WB SF (2 матча)
  slots.push(
    {
      stageType: 'PLAYOFF_UPPER',
      roundNumber: 3,
      slotNumber: 1,
      label: 'WB SF #1',
      source1: 'PLAYOFF_UPPER:2:1',
      source2: 'PLAYOFF_UPPER:2:2',
    },
    {
      stageType: 'PLAYOFF_UPPER',
      roundNumber: 3,
      slotNumber: 2,
      label: 'WB SF #2',
      source1: 'PLAYOFF_UPPER:2:3',
      source2: 'PLAYOFF_UPPER:2:4',
    }
  )

  // WB Final (1 матч)
  slots.push({
    stageType: 'PLAYOFF_UPPER',
    roundNumber: 4,
    slotNumber: 1,
    label: 'WB Final',
    source1: 'PLAYOFF_UPPER:3:1',
    source2: 'PLAYOFF_UPPER:3:2',
    loserGoesTo: 'PLAYOFF_LOWER:6:1',
  })

  // === НИЖНЯЯ СЕТКА (Losers Bracket) ===

  // LB R1 (2 матча): 13vs16, 14vs15
  slots.push(
    { stageType: 'PLAYOFF_LOWER', roundNumber: 1, slotNumber: 1, label: 'LB R1 #1', seed: 13 },
    { stageType: 'PLAYOFF_LOWER', roundNumber: 1, slotNumber: 2, label: 'LB R1 #2', seed: 16 },
    { stageType: 'PLAYOFF_LOWER', roundNumber: 1, slotNumber: 3, label: 'LB R1 #3', seed: 14 },
    { stageType: 'PLAYOFF_LOWER', roundNumber: 1, slotNumber: 4, label: 'LB R1 #4', seed: 15 }
  )

  // LB R2 (2 матча): проигравшие из WB R1
  slots.push(
    {
      stageType: 'PLAYOFF_LOWER',
      roundNumber: 2,
      slotNumber: 1,
      label: 'LB R2 #1',
      source1: 'PLAYOFF_UPPER:1:1:loser',
      source2: 'PLAYOFF_UPPER:1:3:loser',
    },
    {
      stageType: 'PLAYOFF_LOWER',
      roundNumber: 2,
      slotNumber: 2,
      label: 'LB R2 #2',
      source1: 'PLAYOFF_UPPER:1:5:loser',
      source2: 'PLAYOFF_UPPER:1:7:loser',
    }
  )

  // LB R3 (победитель LB R1 vs LB R1)
  slots.push({
    stageType: 'PLAYOFF_LOWER',
    roundNumber: 3,
    slotNumber: 1,
    label: 'LB R3',
    source1: 'PLAYOFF_LOWER:1:1',
    source2: 'PLAYOFF_LOWER:1:3',
  })

  // LB R4 (4 матча): объединение LB R2 + LB R3 + проигравших WB R2
  slots.push(
    {
      stageType: 'PLAYOFF_LOWER',
      roundNumber: 4,
      slotNumber: 1,
      label: 'LB R4 #1',
      source1: 'PLAYOFF_LOWER:2:1',
      source2: 'PLAYOFF_UPPER:2:1:loser',
    },
    {
      stageType: 'PLAYOFF_LOWER',
      roundNumber: 4,
      slotNumber: 2,
      label: 'LB R4 #2',
      source1: 'PLAYOFF_LOWER:2:2',
      source2: 'PLAYOFF_UPPER:2:2:loser',
    },
    {
      stageType: 'PLAYOFF_LOWER',
      roundNumber: 4,
      slotNumber: 3,
      label: 'LB R4 #3',
      source1: 'PLAYOFF_LOWER:3:1',
      source2: 'PLAYOFF_UPPER:2:3:loser',
    },
    {
      stageType: 'PLAYOFF_LOWER',
      roundNumber: 4,
      slotNumber: 4,
      label: 'LB R4 #4',
      source2: 'PLAYOFF_UPPER:2:4:loser',
    }
  )

  // LB R5 / Четвертьфинал (2 матча)
  slots.push(
    {
      stageType: 'PLAYOFF_LOWER',
      roundNumber: 5,
      slotNumber: 1,
      label: 'LB QF #1',
      source1: 'PLAYOFF_LOWER:4:1',
      source2: 'PLAYOFF_LOWER:4:2',
    },
    {
      stageType: 'PLAYOFF_LOWER',
      roundNumber: 5,
      slotNumber: 2,
      label: 'LB QF #2',
      source1: 'PLAYOFF_LOWER:4:3',
      source2: 'PLAYOFF_LOWER:4:4',
    }
  )

  // LB SF (1 матч)
  slots.push({
    stageType: 'PLAYOFF_LOWER',
    roundNumber: 6,
    slotNumber: 1,
    label: 'LB SF',
    source1: 'PLAYOFF_LOWER:5:1',
    source2: 'PLAYOFF_LOWER:5:2',
    loserGoesTo: undefined, // проигравший вылетает (4 место)
  })

  // LB Final (1 матч): победитель LB SF vs проигравший WB Final
  slots.push({
    stageType: 'PLAYOFF_LOWER',
    roundNumber: 7,
    slotNumber: 1,
    label: 'LB Final',
    source1: 'PLAYOFF_LOWER:6:1',
    source2: 'PLAYOFF_UPPER:4:1:loser',
  })

  // === ГРАНД-ФИНАЛ ===

  slots.push({
    stageType: 'GRAND_FINAL',
    roundNumber: 1,
    slotNumber: 1,
    label: 'Гранд-финал',
    source1: 'PLAYOFF_UPPER:4:1',
    source2: 'PLAYOFF_LOWER:7:1',
  })

  return slots
}

/**
 * Определяет в какую сетку попадают команды после швейцарки.
 *
 * По правилам: 1-4 → WB R2, 5-12 → WB R1, 13-16 → LB R1
 */
export interface SeedAssignment {
  teamSeasonId: string
  seed: number
  startStage: 'WB_R1' | 'WB_R2' | 'LB_R1'
}

export function assignSeeds(standings: Array<{ teamSeasonId: string; position: number }>): SeedAssignment[] {
  return standings.map((s) => ({
    teamSeasonId: s.teamSeasonId,
    seed: s.position,
    startStage: s.position <= 4 ? 'WB_R2' : s.position <= 12 ? 'WB_R1' : 'LB_R1',
  }))
}
