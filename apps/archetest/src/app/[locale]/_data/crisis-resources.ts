/**
 * Кризисные ресурсы (safety-net, этап 5.6.4) — телефоны доверия и мягкая копирайтинг-часть.
 *
 * ⚠️ ВСЕ НОМЕРА ПРОВЕРИТЬ НА АКТУАЛЬНОСТЬ ПЕРЕД РЕЛИЗОМ/ФЕСТОМ.
 * Телефон доверия — это функция безопасности: неверный номер хуже отсутствия номера.
 * Аудитория Инпсихофеста — взрослые, поэтому взрослая линия МЧС стоит первой,
 * а детский телефон доверия помечен явной оговоркой (решение Kami 2026-07-05).
 *
 * Юридический контур (5.6.3/5.6.4): пороги и блок используются ТОЛЬКО как забота о
 * человеке, НИКОГДА как «результат скрининга расстройства» — иначе риск квалификации
 * как медуслуги/медизделия.
 */

/** Одна линия помощи */
export interface CrisisHelpline {
  /** Отображаемое название линии */
  name: string
  nameEn: string
  /** Номер в формате для показа (он же tel: после удаления нецифр) */
  phone: string
  /** Режим работы */
  hours: string
  hoursEn: string
  /**
   * Уточнение аудитории/охвата. Обязателен для детской линии, чтобы взрослый
   * посетитель феста не набрал «не свой» номер.
   */
  audience?: string
  audienceEn?: string
}

/**
 * Федеральные линии помощи. Первой — взрослая (МЧС), детская — с пометкой аудитории.
 * Добавляя новую линию, оставляй только официально опубликованные номера.
 */
export const CRISIS_HELPLINES: CrisisHelpline[] = [
  {
    name: 'Горячая линия психологической помощи МЧС России',
    nameEn: 'EMERCOM of Russia psychological help hotline',
    phone: '8-800-333-44-34',
    hours: 'круглосуточно, бесплатно по России',
    hoursEn: 'available 24/7, free within Russia',
  },
  {
    name: 'Всероссийский телефон доверия',
    nameEn: 'All-Russia trust line',
    phone: '8-800-2000-122',
    hours: 'круглосуточно, бесплатно, анонимно',
    hoursEn: 'available 24/7, free and anonymous',
    audience: 'для детей, подростков и родителей',
    audienceEn: 'for children, teenagers and parents',
  },
]

/**
 * Порог балла шкалы (нормализованный %), при котором показывается safety-net.
 * Держим единым для триггер-шкал состояния (DPR/BAR/BOR).
 */
export const SAFETY_NET_THRESHOLD = 60

/**
 * Шкалы-триггеры кризисного блока: депрессивная (DPR), биполярная (BAR),
 * пограничная (BOR) — состояния, при выраженности которых уместно показать
 * ресурсы поддержки. Это НЕ диагноз, а забота (см. дисклеймер).
 */
export const SAFETY_NET_TRIGGER_SCALES = ['DPR', 'BAR', 'BOR'] as const

/**
 * Тёмные шкалы, для которых показываем мягкую дестигматизирующую формулировку
 * (не-пугающую, developmental-тон) при высоком балле.
 */
export const DARK_REASSURANCE_SCALES = ['MAC', 'NAR', 'ANT', 'SAD', 'MAS'] as const

/**
 * Порог для мягкой формулировки по тёмным шкалам. Отдельный от кризисного,
 * т.к. это про тон подачи, а не про безопасность.
 */
export const DARK_REASSURANCE_THRESHOLD = 60

/** Копирайтинг safety-net (ru/en). Тон: заботливый, не-пугающий, без «диагноза». */
export const SAFETY_NET_COPY = {
  title: {
    ru: 'Ваши ответы отражают заметное эмоциональное напряжение',
    en: 'Your answers reflect noticeable emotional strain',
  },
  body: {
    ru: 'Это не диагноз и не оценка — тест не ставит диагнозов. Но если вы сейчас переживаете тяжёлый период, помните: поддержка доступна, и обратиться за ней — проявление заботы о себе, а не слабость.',
    en: 'This is not a diagnosis or a verdict — the test does not diagnose. But if you are going through a hard time right now, remember: support is available, and reaching for it is an act of self-care, not weakness.',
  },
  helplinesTitle: {
    ru: 'Куда можно обратиться',
    en: 'Where you can turn',
  },
  disclaimer: {
    ru: 'Номера приведены для справки. При острой ситуации звоните 112.',
    en: 'Numbers are provided for reference. In an emergency, call 112.',
  },
} as const

/** Копирайтинг мягкой формулировки по тёмным шкалам (ru/en). */
export const DARK_REASSURANCE_COPY = {
  title: {
    ru: 'Про высокие баллы по «тёмным» шкалам',
    en: 'About high scores on the "dark" scales',
  },
  body: {
    ru: 'Высокий балл здесь — не ярлык и не приговор. Эти шкалы описывают стиль поведения в определённых ситуациях, а не «плохого человека». Осознанная черта — это ресурс, которым можно управлять: там, где она мешает, её можно замечать и направлять.',
    en: 'A high score here is not a label or a verdict. These scales describe a behavioral style in particular situations, not a "bad person". A trait you are aware of is a resource you can steer: where it gets in the way, you can notice it and redirect it.',
  },
} as const
