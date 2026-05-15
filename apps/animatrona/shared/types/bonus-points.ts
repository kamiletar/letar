/**
 * Типы бонусных очков
 *
 * Система накопления и траты бонусных очков за раздачу контента.
 */

// ============================================================================
// Транзакции
// ============================================================================

/**
 * Тип транзакции бонусных очков
 */
export type BonusTransactionType =
  | 'earning' // Заработок за раздачу
  | 'achievement' // Награда за достижение
  | 'spending' // Трата очков
  | 'bonus' // Бонус (промо, ивенты)
  | 'adjustment' // Корректировка (админ)

/**
 * Транзакция бонусных очков
 */
export interface BonusTransaction {
  /** Уникальный ID транзакции */
  id: string
  /** Тип транзакции */
  type: BonusTransactionType
  /** Сумма (положительная для начисления, отрицательная для траты) */
  amount: number
  /** Баланс после транзакции */
  balance: number
  /** Описание */
  description: string
  /** Дата транзакции (ISO string) */
  createdAt: string
  /** Метаданные (для категоризации) */
  metadata?: {
    /** ID достижения (для achievement) */
    achievementId?: string
    /** CID контента (для earning) */
    contentCid?: string
    /** ID товара (для spending) */
    itemId?: string
    /** Множители (для earning) */
    multipliers?: string[]
  }
}

// ============================================================================
// Бонусные очки пользователя
// ============================================================================

/**
 * Бонусные очки пользователя
 */
export interface BonusPoints {
  /** Текущий баланс */
  balance: number
  /** Всего заработано */
  totalEarned: number
  /** Всего потрачено */
  totalSpent: number
  /** История транзакций (последние 100) */
  transactions: BonusTransaction[]
}

/**
 * Начальные бонусные очки для нового пользователя
 */
export const INITIAL_BONUS_POINTS: BonusPoints = {
  balance: 0,
  totalEarned: 0,
  totalSpent: 0,
  transactions: [],
}

// ============================================================================
// Ставки заработка
// ============================================================================

/**
 * Базовые ставки заработка очков
 */
export interface EarningRates {
  /** Базовая ставка за 1 GB upload */
  baseRatePerGB: number

  /** Множители */
  multipliers: {
    /** Бонус за старый контент (>1 года) */
    oldContent: number
    /** Бонус за редкий контент (<5 сидеров) */
    rareContent: number
    /** Бонус за ночную раздачу (00:00-06:00) */
    nightSeeding: number
    /** Бонус за раздачу в выходные */
    weekendSeeding: number
  }
}

/**
 * Дефолтные ставки заработка
 */
export const DEFAULT_EARNING_RATES: EarningRates = {
  baseRatePerGB: 10,
  multipliers: {
    oldContent: 1.5, // +50%
    rareContent: 2.0, // +100%
    nightSeeding: 1.2, // +20%
    weekendSeeding: 1.1, // +10%
  },
}

// ============================================================================
// Товары для траты
// ============================================================================

/**
 * Категория товара
 */
export type BonusItemCategory =
  | 'cosmetic' // Косметика (темы, значки)
  | 'feature' // Функции (приоритет, расширения)
  | 'boost' // Бусты (временные бонусы)

/**
 * Товар для покупки за бонусные очки
 */
export interface BonusItem {
  /** ID товара */
  id: string
  /** Название */
  name: string
  /** Описание */
  description: string
  /** Категория */
  category: BonusItemCategory
  /** Цена в очках */
  price: number
  /** Иконка (emoji) */
  icon: string
  /** Доступен для покупки */
  available: boolean
}

// ============================================================================
// IPC типы
// ============================================================================

/**
 * Результат операции с бонусами
 */
export interface BonusOperationResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * События бонусов
 */
export type BonusEventType = 'bonus:earned' | 'bonus:spent' | 'bonus:balanceChanged'

/**
 * Payload события изменения баланса
 */
export interface BalanceChangedEvent {
  oldBalance: number
  newBalance: number
  transaction: BonusTransaction
}

/**
 * Запрос на трату очков
 */
export interface SpendRequest {
  /** ID товара */
  itemId: string
  /** Количество (для расходуемых товаров) */
  quantity?: number
}
