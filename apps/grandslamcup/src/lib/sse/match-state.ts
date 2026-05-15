/**
 * In-memory состояние живого матча
 *
 * Эфемерные данные (фаза голосования, подключённые судьи, текущий выступающий)
 * хранятся в памяти. Персистентные данные (голоса, перформансы) — в БД.
 *
 * @module match-state
 */

/** Фаза голосования в раунде */
export type VotingPhase =
  | 'IDLE' // Ожидание (между раундами)
  | 'PERFORMING' // Поэт на сцене, таймер идёт
  | 'TEXT_VOTING' // Голосование за текст
  | 'TEXT_COMPLETE' // Текст подсчитан, ждём подачу
  | 'DELIVERY_VOTING' // Голосование за подачу
  | 'DELIVERY_COMPLETE' // Подача подсчитана, ждём подтверждения скорера
  | 'POET_RESULT' // Скорер видит результат поэта — итоговые оценки, «Следующий поэт»
  | 'ROUND_COMPLETE' // Раунд завершён (оба поэта оценены)
  | 'HALF_SUMMARY' // Все 5 пар тайма сыграны — скорер видит итоги тайма
  | 'INTERMISSION' // Перерыв между 1-м и 2-м таймом

/** Информация о подключённом судье */
export interface ConnectedJudge {
  /** ID сессии в БД */
  sessionId: string
  /** Имя судьи (для ручных — пустая строка или «Слот N») */
  name: string
  /** Номер судьи (1-5) */
  judgeNumber: number
  /** Цвет судьи для визуальной идентификации. null для ручных (их телефон не светится) */
  color: import('@/lib/judge-colors').JudgeColor | null
  /** Проголосовал ли за текущее измерение */
  hasVoted: boolean
  /** Ручное управление: оценки вводит счётовод, телефон не используется */
  manual?: boolean
}

/** Судья в очереди ожидания */
export interface QueuedJudge {
  /** ID сессии в БД */
  sessionId: string
  /** Имя судьи */
  name: string
  /** Позиция в очереди (1 = следующий) */
  position: number
}

/** Состояние таймера выступления */
export interface TimerState {
  /** Таймер запущен */
  isRunning: boolean
  /** Время запуска (Date.now()) */
  startedAt: number | null
  /** Накопленное время в секундах (для паузы/рестарта) */
  accumulatedSec: number
  /** ID текущего перформанса (для сохранения durationSec) */
  performanceId: string | null
}

/** Текущее выступление (кто на сцене) */
export interface CurrentPerformance {
  /** ID перформанса в БД */
  performanceId: string
  /** Имя поэта */
  playerName: string
  /** ID команды */
  teamSeasonId: string
  /** Название команды */
  teamName: string
  /** Тайм */
  half: number
  /** Номер раунда */
  roundNumber: number
}

/** In-memory состояние одного матча */
export interface MatchLiveState {
  /** ID матча */
  matchId: string
  /** Текущая фаза голосования */
  phase: VotingPhase
  /** Текущий тайм (1 или 2) */
  currentHalf: number
  /** Текущий раунд в тайме (1-5) */
  currentRound: number
  /** Ключ приглашения для судей (меняется каждый тайм) */
  inviteKey: string | null
  /** Подключённые судьи (текущий тайм, макс 5) */
  judges: ConnectedJudge[]
  /** Очередь ожидания (6+ зарегистрированных) */
  judgeQueue: QueuedJudge[]
  /** Fingerprint-ы отведённых судей (не могут снова подать заявку в этом тайме) */
  recusedFingerprints: string[]
  /** Текущие выступления в раунде (до 2 — по одному от каждой команды) */
  currentPerformances: CurrentPerformance[]
  /** Индекс текущего выступающего в раунде (0 = первый поэт, 1 = второй) */
  currentPerformerIndex: number
  /** Состояние таймера выступления */
  timer: TimerState
  /** Время открытия голосования (для клиентского расчёта таймаута судей) */
  votingOpenedAt: number | null
  /** Разрешён ли отвод судьи тренерами */
  judgeRecusalAllowed: boolean
  /** Текущие оценки судей за активное голосование: judgeNumber → score */
  currentVoteScores: Partial<Record<number, number>>
}

/**
 * Создать начальное состояние матча
 */
export function createInitialMatchState(matchId: string): MatchLiveState {
  return {
    matchId,
    phase: 'IDLE',
    currentHalf: 1,
    currentRound: 1,
    inviteKey: null,
    judges: [],
    judgeQueue: [],
    recusedFingerprints: [],
    currentPerformances: [],
    currentPerformerIndex: 0,
    timer: {
      isRunning: false,
      startedAt: null,
      accumulatedSec: 0,
      performanceId: null,
    },
    votingOpenedAt: null,
    judgeRecusalAllowed: false,
    currentVoteScores: {},
  }
}

// === Глобальное хранилище (singleton через globalThis) ===

const globalForMatchState = globalThis as unknown as {
  matchStates?: Map<string, MatchLiveState>
}

/** Получить или создать хранилище состояний матчей */
export function getMatchStates(): Map<string, MatchLiveState> {
  if (!globalForMatchState.matchStates) {
    globalForMatchState.matchStates = new Map()
  }
  return globalForMatchState.matchStates
}

/** Получить состояние матча (создаёт новое если нет) */
export function getMatchState(matchId: string): MatchLiveState {
  const states = getMatchStates()
  let state = states.get(matchId)
  if (!state) {
    state = createInitialMatchState(matchId)
    states.set(matchId, state)
  }
  return state
}

/** Обновить состояние матча */
export function updateMatchState(matchId: string, updater: (state: MatchLiveState) => void): MatchLiveState {
  const state = getMatchState(matchId)
  updater(state)
  return state
}

/** Удалить состояние матча (при завершении) */
export function removeMatchState(matchId: string): void {
  getMatchStates().delete(matchId)
}
