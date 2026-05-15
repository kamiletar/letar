/**
 * Шаг онбординга
 */
export interface OnboardingStep {
  /** Уникальный идентификатор шага */
  id: string
  /** Селектор data-onboarding атрибута целевого элемента */
  target: string
  /** Заголовок подсказки */
  title: string
  /** Описание подсказки */
  description: string
  /** Позиция относительно целевого элемента */
  position: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Шаги онбординга для сайта мандал
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'gallery',
    target: 'gallery-link',
    title: 'Галерея мандал',
    description: 'Выберите мандалу для медитации из нашей коллекции',
    position: 'bottom',
  },
  {
    id: 'fullscreen',
    target: 'fullscreen-btn',
    title: 'Полноэкранный режим',
    description: 'Погрузитесь в медитацию с полным погружением',
    position: 'left',
  },
  {
    id: 'audio',
    target: 'audio-btn',
    title: 'Медитативная музыка',
    description: 'Включите музыку для глубокого расслабления',
    position: 'left',
  },
  {
    id: 'presets',
    target: 'presets-panel',
    title: 'Атмосферные пресеты',
    description: 'Быстро настройте атмосферу: спокойствие, энергия или медитация',
    position: 'bottom',
  },
  {
    id: 'breathing',
    target: 'breathing-btn',
    title: 'Дыхательные упражнения',
    description: 'Следуйте ритму дыхания для медитации',
    position: 'left',
  },
]

/** Ключ localStorage для сохранения состояния онбординга */
export const ONBOARDING_STORAGE_KEY = 'mandala-onboarding-completed'
