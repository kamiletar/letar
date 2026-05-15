/**
 * Хелперы для работы с localStorage в онбординге
 *
 * Выделен из onboarding-wizard.tsx для переиспользуемости
 */

import { initialFormData, type OnboardingFormData, STORAGE_KEY_PREFIX } from './onboarding-context'

interface StoredOnboardingState {
  step: number
  formData: OnboardingFormData
}

/**
 * Получает ключ localStorage для конкретного пользователя
 */
function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}-${userId}`
}

/**
 * Сохраняет состояние онбординга в localStorage
 */
export function saveOnboardingState(userId: string, step: number, formData: OnboardingFormData): void {
  localStorage.setItem(getStorageKey(userId), JSON.stringify({ step, formData }))
}

/**
 * Загружает состояние онбординга из localStorage
 * @param userId - ID пользователя
 * @param initialName - имя от OAuth провайдера (если есть)
 */
export function loadOnboardingState(userId: string, initialName: string): StoredOnboardingState | null {
  const saved = localStorage.getItem(getStorageKey(userId))
  if (!saved) {
    return null
  }

  try {
    const parsed = JSON.parse(saved)
    const step = parsed.step ?? 0
    // Используем сохранённое имя, если оно есть, иначе initialName от OAuth
    const savedName = parsed.formData?.name || initialName
    const formData = { ...initialFormData, ...parsed.formData, name: savedName }

    return { step, formData }
  } catch {
    // Игнорируем ошибки парсинга
    return null
  }
}

/**
 * Очищает состояние онбординга из localStorage
 */
export function clearOnboardingState(userId: string): void {
  localStorage.removeItem(getStorageKey(userId))
}
