'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

// Типы стилей
export type StyleType = 'classic' | 'romantic' | 'dramatic' | 'natural' | 'creative' | 'minimalist'

// Типы цветотипов
export type ColorType = 'spring' | 'summer' | 'autumn' | 'winter'

// Типы силуэтов платья
export type DressStyle = 'a_line' | 'sheath' | 'empire' | 'fit_and_flare' | 'wrap' | 'shift'

// Конфигурация стилей
export const STYLE_CONFIG: Record<
  StyleType,
  {
    name: string
    emoji: string
    description: string
    characteristics: string[]
    recommendations: string[]
    colors: string[]
    avoid: string[]
  }
> = {
  classic: {
    name: 'Классический',
    emoji: '👔',
    description: 'Элегантность, сдержанность и вневременной стиль. Вы цените качество и традиции.',
    characteristics: [
      'Симметрия и пропорциональность',
      'Нейтральные цвета',
      'Качественные материалы',
      'Минимум украшений',
    ],
    recommendations: ['Костюмы-двойки', 'Прямые брюки', 'Белые рубашки', 'Тренчи', 'Лодочки', 'Жемчуг'],
    colors: ['Чёрный', 'Белый', 'Бежевый', 'Тёмно-синий', 'Серый'],
    avoid: ['Неоновые цвета', 'Слишком откровенные вещи', 'Чрезмерный декор'],
  },
  romantic: {
    name: 'Романтический',
    emoji: '🌸',
    description: 'Нежность, женственность и мечтательность. Вы любите красоту в деталях.',
    characteristics: ['Мягкие линии и драпировки', 'Цветочные принты', 'Кружево и рюши', 'Пастельные оттенки'],
    recommendations: [
      'Платья с воланами',
      'Блузы с бантами',
      'Юбки-миди',
      'Кардиганы',
      'Балетки',
      'Украшения с цветами',
    ],
    colors: ['Розовый', 'Лавандовый', 'Персиковый', 'Голубой', 'Кремовый'],
    avoid: ['Грубые ткани', 'Геометрические принты', 'Тяжёлая обувь'],
  },
  dramatic: {
    name: 'Драматический',
    emoji: '🔥',
    description: 'Смелость, уверенность и эффектность. Вы любите быть в центре внимания.',
    characteristics: ['Контрастные сочетания', 'Острые линии и углы', 'Крупные аксессуары', 'Насыщенные цвета'],
    recommendations: [
      'Структурные жакеты',
      'Платья-футляры',
      'Высокие каблуки',
      'Крупные серьги',
      'Кожаные изделия',
      'Красная помада',
    ],
    colors: ['Чёрный', 'Красный', 'Белый', 'Изумрудный', 'Бордовый'],
    avoid: ['Мелкие принты', 'Пастельные цвета', 'Скромные аксессуары'],
  },
  natural: {
    name: 'Натуральный',
    emoji: '🍃',
    description: 'Комфорт, практичность и близость к природе. Вы цените удобство и естественность.',
    characteristics: ['Свободный крой', 'Натуральные ткани', 'Земляные тона', 'Многослойность'],
    recommendations: [
      'Льняные рубашки',
      'Свободные брюки',
      'Вязаные свитера',
      'Мокасины',
      'Холщовые сумки',
      'Деревянные украшения',
    ],
    colors: ['Хаки', 'Коричневый', 'Бежевый', 'Оливковый', 'Терракотовый'],
    avoid: ['Синтетика', 'Блёстки', 'Высокие каблуки'],
  },
  creative: {
    name: 'Креативный',
    emoji: '🎨',
    description: 'Индивидуальность, артистизм и эксперименты. Вы не боитесь выделяться.',
    characteristics: ['Необычные сочетания', 'Яркие акценты', 'Винтажные элементы', 'Смешение стилей'],
    recommendations: [
      'Асимметричные вещи',
      'Винтажные находки',
      'Необычные аксессуары',
      'Принты и узоры',
      'Многослойность',
      'Handmade украшения',
    ],
    colors: ['Любые яркие', 'Контрастные сочетания', 'Неон', 'Металлик'],
    avoid: ['Однообразие', 'Слишком строгие правила', 'Массмаркет'],
  },
  minimalist: {
    name: 'Минималист',
    emoji: '⬜',
    description: 'Простота, функциональность и чистые линии. Меньше — значит больше.',
    characteristics: ['Чистые линии', 'Монохром', 'Качество над количеством', 'Базовые вещи'],
    recommendations: [
      'Базовые футболки',
      'Прямые джинсы',
      'Простые платья',
      'Лаконичные сумки',
      'Белые кроссовки',
      'Минимум украшений',
    ],
    colors: ['Чёрный', 'Белый', 'Серый', 'Бежевый', 'Тёмно-синий'],
    avoid: ['Избыточный декор', 'Кричащие принты', 'Слишком много цветов'],
  },
}

// Конфигурация цветотипов
export const COLOR_TYPE_CONFIG: Record<
  ColorType,
  {
    name: string
    emoji: string
    season: string
    description: string
    characteristics: string[]
    bestColors: string[]
    avoidColors: string[]
    metals: string[]
  }
> = {
  spring: {
    name: 'Весна',
    emoji: '🌷',
    season: 'Тёплый светлый',
    description: 'Яркая, свежая внешность с тёплым подтоном. Как первые весенние цветы.',
    characteristics: [
      'Светлые или рыжеватые волосы',
      'Светлая кожа с персиковым подтоном',
      'Веснушки',
      'Голубые, зелёные или карие глаза',
    ],
    bestColors: ['Коралловый', 'Персиковый', 'Лососевый', 'Тёплый бежевый', 'Золотистый', 'Аквамарин'],
    avoidColors: ['Чёрный', 'Холодный розовый', 'Серый', 'Бордовый'],
    metals: ['Золото', 'Медь', 'Бронза'],
  },
  summer: {
    name: 'Лето',
    emoji: '🌊',
    season: 'Холодный светлый',
    description: 'Мягкая, приглушённая внешность с холодным подтоном. Как летнее море.',
    characteristics: [
      'Пепельные или русые волосы',
      'Розоватая или оливковая кожа',
      'Серые, голубые или зелёные глаза',
      'Низкий контраст внешности',
    ],
    bestColors: ['Пыльная роза', 'Лавандовый', 'Серо-голубой', 'Малиновый', 'Мятный', 'Сиреневый'],
    avoidColors: ['Оранжевый', 'Ярко-жёлтый', 'Терракотовый', 'Тёплый коричневый'],
    metals: ['Серебро', 'Белое золото', 'Платина'],
  },
  autumn: {
    name: 'Осень',
    emoji: '🍂',
    season: 'Тёплый тёмный',
    description: 'Насыщенная, глубокая внешность с тёплым подтоном. Как осенний лес.',
    characteristics: [
      'Рыжие, каштановые или тёмно-русые волосы',
      'Тёплая кожа с золотистым подтоном',
      'Карие, зелёные или ореховые глаза',
      'Часто веснушки',
    ],
    bestColors: ['Терракотовый', 'Горчичный', 'Оливковый', 'Коричневый', 'Бордовый', 'Коралловый'],
    avoidColors: ['Холодный розовый', 'Серый', 'Чёрный', 'Голубой'],
    metals: ['Золото', 'Медь', 'Бронза'],
  },
  winter: {
    name: 'Зима',
    emoji: '❄️',
    season: 'Холодный тёмный',
    description: 'Контрастная, яркая внешность с холодным подтоном. Как зимний день.',
    characteristics: [
      'Тёмные или очень светлые волосы',
      'Светлая или смуглая кожа с холодным подтоном',
      'Яркие глаза (голубые, зелёные, карие)',
      'Высокий контраст внешности',
    ],
    bestColors: ['Чёрный', 'Белый', 'Ярко-красный', 'Изумрудный', 'Фуксия', 'Королевский синий'],
    avoidColors: ['Тёплый бежевый', 'Оранжевый', 'Золотистый', 'Тёплый коричневый'],
    metals: ['Серебро', 'Белое золото', 'Платина'],
  },
}

// Конфигурация силуэтов платья
export const DRESS_STYLE_CONFIG: Record<
  DressStyle,
  {
    name: string
    emoji: string
    description: string
    bestFor: string[]
    occasions: string[]
  }
> = {
  a_line: {
    name: 'А-силуэт',
    emoji: '👗',
    description: 'Приталенный верх и расклешённая юбка. Универсальный и женственный.',
    bestFor: ['Фигура груша', 'Фигура песочные часы', 'Хочет скрыть бёдра'],
    occasions: ['Повседневность', 'Офис', 'Свидание', 'Праздник'],
  },
  sheath: {
    name: 'Футляр',
    emoji: '📏',
    description: 'Прямой крой, повторяющий линии тела. Элегантный и строгий.',
    bestFor: ['Фигура прямоугольник', 'Фигура песочные часы', 'Стройная фигура'],
    occasions: ['Офис', 'Деловая встреча', 'Коктейль'],
  },
  empire: {
    name: 'Ампир',
    emoji: '👸',
    description: 'Завышенная талия под грудью и свободная юбка. Романтичный и лёгкий.',
    bestFor: ['Фигура яблоко', 'Беременность', 'Хочет скрыть живот'],
    occasions: ['Праздник', 'Свадьба', 'Летний отдых'],
  },
  fit_and_flare: {
    name: 'Приталенное с расклешённой юбкой',
    emoji: '💃',
    description: 'Облегающий верх и пышная юбка. Игривый и женственный.',
    bestFor: ['Фигура песочные часы', 'Хочет подчеркнуть талию'],
    occasions: ['Свидание', 'Вечеринка', 'Выпускной'],
  },
  wrap: {
    name: 'Платье с запахом',
    emoji: '🎀',
    description: 'Запах на груди с поясом на талии. Универсальный и соблазнительный.',
    bestFor: ['Любая фигура', 'Большая грудь', 'Хочет подчеркнуть талию'],
    occasions: ['Офис', 'Свидание', 'Повседневность'],
  },
  shift: {
    name: 'Платье-трапеция',
    emoji: '📐',
    description: 'Прямой свободный крой без акцента на талии. Комфортный и модный.',
    bestFor: ['Фигура прямоугольник', 'Хочет скрыть живот и бёдра'],
    occasions: ['Офис', 'Повседневность', 'Деловой обед'],
  },
}

// Вопросы квизов
export interface QuizOption {
  id: string
  text: string
  imageUrl?: string
  styles?: StyleType[]
  colorTypes?: ColorType[]
  dressStyles?: DressStyle[]
}

export interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
}

// Квиз "Определи свой стиль"
export const STYLE_QUIZ: QuizQuestion[] = [
  {
    id: 'wardrobe_base',
    question: 'Какие вещи составляют основу вашего гардероба?',
    options: [
      { id: 'a', text: 'Строгие костюмы, рубашки, классические брюки', styles: ['classic'] },
      { id: 'b', text: 'Платья, юбки, блузы с деталями', styles: ['romantic'] },
      { id: 'c', text: 'Яркие вещи, необычные сочетания', styles: ['dramatic', 'creative'] },
      { id: 'd', text: 'Удобные джинсы, свитера, простые вещи', styles: ['natural', 'minimalist'] },
    ],
  },
  {
    id: 'color_preference',
    question: 'Какие цвета вы предпочитаете в одежде?',
    options: [
      { id: 'a', text: 'Нейтральные: чёрный, белый, бежевый, серый', styles: ['classic', 'minimalist'] },
      { id: 'b', text: 'Пастельные: розовый, голубой, лавандовый', styles: ['romantic'] },
      { id: 'c', text: 'Яркие и контрастные сочетания', styles: ['dramatic', 'creative'] },
      { id: 'd', text: 'Природные: хаки, коричневый, оливковый', styles: ['natural'] },
    ],
  },
  {
    id: 'accessories',
    question: 'Какие аксессуары вам ближе?',
    options: [
      { id: 'a', text: 'Классические часы, жемчуг, сдержанные украшения', styles: ['classic'] },
      { id: 'b', text: 'Нежные цветочные украшения, ленты, броши', styles: ['romantic'] },
      { id: 'c', text: 'Крупные серьги, массивные браслеты, statement pieces', styles: ['dramatic'] },
      { id: 'd', text: 'Минимум аксессуаров или натуральные материалы', styles: ['natural', 'minimalist'] },
    ],
  },
  {
    id: 'shopping_approach',
    question: 'Как вы обычно покупаете одежду?',
    options: [
      { id: 'a', text: 'Инвестирую в качественные базовые вещи', styles: ['classic', 'minimalist'] },
      { id: 'b', text: 'Ищу красивые, женственные вещи с деталями', styles: ['romantic'] },
      { id: 'c', text: 'Покупаю всё, что привлекает внимание', styles: ['dramatic', 'creative'] },
      { id: 'd', text: 'Главное — удобство и практичность', styles: ['natural'] },
    ],
  },
  {
    id: 'event_outfit',
    question: 'Что вы наденете на важное мероприятие?',
    options: [
      { id: 'a', text: 'Элегантное платье-футляр или костюм', styles: ['classic'] },
      { id: 'b', text: 'Воздушное платье с романтичными деталями', styles: ['romantic'] },
      { id: 'c', text: 'Эффектный наряд, который запомнят', styles: ['dramatic'] },
      { id: 'd', text: 'Что-то стильное, но комфортное', styles: ['natural', 'minimalist'] },
    ],
  },
  {
    id: 'pattern_preference',
    question: 'Какие принты вам нравятся?',
    options: [
      { id: 'a', text: 'Полоска, клетка, классические узоры', styles: ['classic'] },
      { id: 'b', text: 'Цветочные, нежные абстрактные', styles: ['romantic'] },
      { id: 'c', text: 'Леопард, геометрия, яркие принты', styles: ['dramatic', 'creative'] },
      { id: 'd', text: 'Предпочитаю однотонные вещи', styles: ['minimalist', 'natural'] },
    ],
  },
  {
    id: 'shoes_choice',
    question: 'Какую обувь вы носите чаще всего?',
    options: [
      { id: 'a', text: 'Лодочки, оксфорды, классические туфли', styles: ['classic'] },
      { id: 'b', text: 'Балетки, босоножки с ремешками', styles: ['romantic'] },
      { id: 'c', text: 'Яркие каблуки, ботильоны, statement обувь', styles: ['dramatic'] },
      { id: 'd', text: 'Кеды, мокасины, удобная обувь', styles: ['natural', 'minimalist'] },
    ],
  },
  {
    id: 'bag_style',
    question: 'Какая сумка вам подходит?',
    options: [
      { id: 'a', text: 'Структурированная, лаконичная, качественная', styles: ['classic', 'minimalist'] },
      { id: 'b', text: 'С декором, нежных оттенков, с деталями', styles: ['romantic'] },
      { id: 'c', text: 'Необычной формы, яркого цвета', styles: ['dramatic', 'creative'] },
      { id: 'd', text: 'Вместительная, практичная, из натуральных материалов', styles: ['natural'] },
    ],
  },
  {
    id: 'style_icon',
    question: 'Чей стиль вам ближе?',
    options: [
      { id: 'a', text: 'Одри Хепберн, Кейт Миддлтон', styles: ['classic'] },
      { id: 'b', text: 'Тейлор Свифт, Эмма Уотсон', styles: ['romantic'] },
      { id: 'c', text: 'Леди Гага, Рианна', styles: ['dramatic', 'creative'] },
      { id: 'd', text: 'Дженнифер Энистон, Меган Маркл', styles: ['natural', 'minimalist'] },
    ],
  },
  {
    id: 'compliment',
    question: 'Какой комплимент вам приятнее получить?',
    options: [
      { id: 'a', text: '"Вы всегда так элегантны!"', styles: ['classic'] },
      { id: 'b', text: '"Какая вы женственная и нежная!"', styles: ['romantic'] },
      { id: 'c', text: '"Вау, какой яркий образ!"', styles: ['dramatic', 'creative'] },
      { id: 'd', text: '"Тебе так идёт этот простой стиль!"', styles: ['natural', 'minimalist'] },
    ],
  },
]

// Квиз "Определи цветотип"
export const COLOR_TYPE_QUIZ: QuizQuestion[] = [
  {
    id: 'vein_color',
    question: 'Какого цвета вены на запястье при дневном свете?',
    options: [
      { id: 'a', text: 'Зеленоватые или оливковые', colorTypes: ['spring', 'autumn'] },
      { id: 'b', text: 'Голубые или фиолетовые', colorTypes: ['summer', 'winter'] },
      { id: 'c', text: 'Смешанные, сине-зелёные', colorTypes: ['summer', 'autumn'] },
    ],
  },
  {
    id: 'sun_reaction',
    question: 'Как ваша кожа реагирует на солнце?',
    options: [
      { id: 'a', text: 'Легко загораю золотистым', colorTypes: ['spring', 'autumn'] },
      { id: 'b', text: 'Сначала краснею, потом немного загораю', colorTypes: ['summer'] },
      { id: 'c', text: 'Почти не загораю или загар оливковый', colorTypes: ['winter'] },
    ],
  },
  {
    id: 'hair_color',
    question: 'Какой ваш натуральный цвет волос?',
    options: [
      { id: 'a', text: 'Светло-русые, золотистые, рыжеватые', colorTypes: ['spring'] },
      { id: 'b', text: 'Пепельно-русые, мышиные', colorTypes: ['summer'] },
      { id: 'c', text: 'Каштановые, рыжие, тёмно-русые с рыжиной', colorTypes: ['autumn'] },
      { id: 'd', text: 'Чёрные, тёмно-каштановые, пепельные', colorTypes: ['winter'] },
    ],
  },
  {
    id: 'eye_color',
    question: 'Какой у вас цвет глаз?',
    options: [
      { id: 'a', text: 'Голубые, зелёные, светло-карие с золотинкой', colorTypes: ['spring'] },
      { id: 'b', text: 'Серо-голубые, серо-зелёные, мягкие', colorTypes: ['summer'] },
      { id: 'c', text: 'Тёмно-карие, зелёные с коричневым, ореховые', colorTypes: ['autumn'] },
      { id: 'd', text: 'Яркие голубые, тёмно-карие, контрастные', colorTypes: ['winter'] },
    ],
  },
  {
    id: 'jewelry_test',
    question: 'Какие украшения лучше смотрятся у лица?',
    options: [
      { id: 'a', text: 'Золотые, медные, бронзовые', colorTypes: ['spring', 'autumn'] },
      { id: 'b', text: 'Серебряные, белое золото, платина', colorTypes: ['summer', 'winter'] },
    ],
  },
  {
    id: 'white_test',
    question: 'Какой белый цвет вам идёт больше?',
    options: [
      { id: 'a', text: 'Кремовый, слоновая кость', colorTypes: ['spring', 'autumn'] },
      { id: 'b', text: 'Чисто-белый, снежный', colorTypes: ['summer', 'winter'] },
    ],
  },
  {
    id: 'black_test',
    question: 'Как вы выглядите в чёрном?',
    options: [
      { id: 'a', text: 'Лицо тускнеет, появляются тени', colorTypes: ['spring', 'autumn'] },
      { id: 'b', text: 'Лицо становится ярче, контрастнее', colorTypes: ['winter'] },
      { id: 'c', text: 'Нормально, но лучше тёмно-серый', colorTypes: ['summer'] },
    ],
  },
  {
    id: 'contrast',
    question: 'Насколько контрастная ваша внешность?',
    options: [
      { id: 'a', text: 'Низкий контраст — волосы, глаза, кожа похожи по тону', colorTypes: ['summer', 'spring'] },
      { id: 'b', text: 'Средний контраст', colorTypes: ['autumn'] },
      { id: 'c', text: 'Высокий контраст — большая разница между волосами и кожей', colorTypes: ['winter'] },
    ],
  },
]

// Квиз "Идеальное платье"
export const DRESS_QUIZ: QuizQuestion[] = [
  {
    id: 'body_concern',
    question: 'Какую часть тела вы хотите подчеркнуть или скрыть?',
    options: [
      { id: 'a', text: 'Хочу скрыть бёдра', dressStyles: ['a_line', 'empire'] },
      { id: 'b', text: 'Хочу подчеркнуть талию', dressStyles: ['fit_and_flare', 'wrap'] },
      { id: 'c', text: 'Хочу скрыть живот', dressStyles: ['empire', 'shift'] },
      { id: 'd', text: 'Хочу показать стройность', dressStyles: ['sheath'] },
    ],
  },
  {
    id: 'comfort_level',
    question: 'Насколько облегающее платье вам комфортно?',
    options: [
      { id: 'a', text: 'Люблю облегающие, подчёркивающие фигуру', dressStyles: ['sheath', 'wrap'] },
      { id: 'b', text: 'Предпочитаю свободный крой', dressStyles: ['shift', 'empire'] },
      { id: 'c', text: 'Комбинация: облегающий верх, свободный низ', dressStyles: ['a_line', 'fit_and_flare'] },
    ],
  },
  {
    id: 'occasion',
    question: 'Для какого случая чаще нужно платье?',
    options: [
      { id: 'a', text: 'Офис и деловые встречи', dressStyles: ['sheath', 'shift'] },
      { id: 'b', text: 'Свидания и вечеринки', dressStyles: ['fit_and_flare', 'wrap'] },
      { id: 'c', text: 'Повседневная носка', dressStyles: ['shift', 'a_line'] },
      { id: 'd', text: 'Торжественные мероприятия', dressStyles: ['a_line', 'empire'] },
    ],
  },
  {
    id: 'style_vibe',
    question: 'Какое настроение хотите создать?',
    options: [
      { id: 'a', text: 'Строгое и деловое', dressStyles: ['sheath', 'shift'] },
      { id: 'b', text: 'Романтичное и женственное', dressStyles: ['empire', 'fit_and_flare'] },
      { id: 'c', text: 'Соблазнительное и элегантное', dressStyles: ['wrap', 'sheath'] },
      { id: 'd', text: 'Лёгкое и игривое', dressStyles: ['a_line', 'fit_and_flare'] },
    ],
  },
  {
    id: 'body_type',
    question: 'Какой у вас тип фигуры?',
    options: [
      {
        id: 'a',
        text: 'Песочные часы — грудь и бёдра примерно равны, талия выражена',
        dressStyles: ['wrap', 'fit_and_flare', 'sheath'],
      },
      { id: 'b', text: 'Груша — бёдра шире плеч', dressStyles: ['a_line', 'empire'] },
      { id: 'c', text: 'Яблоко — объём в районе живота', dressStyles: ['empire', 'shift'] },
      { id: 'd', text: 'Прямоугольник — мало выражена талия', dressStyles: ['fit_and_flare', 'wrap'] },
    ],
  },
]

// Типы квизов
export type QuizType = 'style' | 'colorType' | 'dress'

export interface QuizResult {
  quizType: QuizType
  answers: Record<string, string>
  result: StyleType | ColorType | DressStyle
  scores: Record<string, number>
  completedAt: Date
}

export interface QuizState {
  results: QuizResult[]
}

// Ключ для IndexedDB
const QUIZ_STORAGE_KEY = 'premium-rosstil-quiz'

// Глобальное состояние
let quizState: QuizState = {
  results: [],
}
const listeners: Set<() => void> = new Set()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

// Загрузка из IndexedDB
const loadFromStorage = async (): Promise<void> => {
  try {
    const stored = await get<QuizState>(QUIZ_STORAGE_KEY)
    if (stored) {
      quizState = stored
      notifyListeners()
    }
  } catch (error) {
    console.error('Ошибка загрузки квизов:', error)
  }
}

// Сохранение в IndexedDB
const saveToStorage = async (): Promise<void> => {
  try {
    await set(QUIZ_STORAGE_KEY, quizState)
  } catch (error) {
    console.error('Ошибка сохранения квизов:', error)
  }
}

// Инициализация
let initialized = false
const initialize = () => {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    loadFromStorage()
  }
}

/**
 * Сброс состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __resetQuizState() {
  quizState = { results: [] }
  initialized = false
  listeners.clear()
}

/**
 * Установка начального состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __setQuizState(state: QuizState) {
  quizState = state
  listeners.forEach((l) => l())
}

/**
 * Хук для работы с квизами
 */
export function useStyleQuiz() {
  const [isLoading, setIsLoading] = useState(true)

  // Подписка на изменения состояния
  const state = useSyncExternalStore(
    (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    () => quizState,
    () => quizState
  )

  useEffect(() => {
    initialize()
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  // Получить вопросы для квиза
  const getQuizQuestions = useCallback((quizType: QuizType): QuizQuestion[] => {
    switch (quizType) {
      case 'style':
        return STYLE_QUIZ
      case 'colorType':
        return COLOR_TYPE_QUIZ
      case 'dress':
        return DRESS_QUIZ
    }
  }, [])

  // Вычислить результат квиза
  const calculateResult = useCallback(
    (
      quizType: QuizType,
      answers: Record<string, string>
    ): { result: StyleType | ColorType | DressStyle; scores: Record<string, number> } => {
      const questions = getQuizQuestions(quizType)
      const scores: Record<string, number> = {}

      // Подсчёт очков
      for (const [questionId, optionId] of Object.entries(answers)) {
        const question = questions.find((q) => q.id === questionId)
        if (!question) {
          continue
        }

        const option = question.options.find((o) => o.id === optionId)
        if (!option) {
          continue
        }

        let types: string[] = []
        switch (quizType) {
          case 'style':
            types = option.styles || []
            break
          case 'colorType':
            types = option.colorTypes || []
            break
          case 'dress':
            types = option.dressStyles || []
            break
        }

        for (const type of types) {
          scores[type] = (scores[type] || 0) + 1
        }
      }

      // Найти тип с максимальным счётом
      let maxScore = 0
      let result = ''
      for (const [type, score] of Object.entries(scores)) {
        if (score > maxScore) {
          maxScore = score
          result = type
        }
      }

      // Если нет результата, вернуть дефолтный
      if (!result) {
        switch (quizType) {
          case 'style':
            result = 'classic'
            break
          case 'colorType':
            result = 'summer'
            break
          case 'dress':
            result = 'a_line'
            break
        }
      }

      return {
        result: result as StyleType | ColorType | DressStyle,
        scores,
      }
    },
    [getQuizQuestions]
  )

  // Сохранить результат квиза
  const saveQuizResult = useCallback(
    async (quizType: QuizType, answers: Record<string, string>): Promise<QuizResult> => {
      const { result, scores } = calculateResult(quizType, answers)

      const quizResult: QuizResult = {
        quizType,
        answers,
        result,
        scores,
        completedAt: new Date(),
      }

      // Обновить или добавить результат
      const existingIndex = quizState.results.findIndex((r) => r.quizType === quizType)
      if (existingIndex >= 0) {
        quizState.results[existingIndex] = quizResult
      } else {
        quizState.results.push(quizResult)
      }

      quizState = { ...quizState }
      notifyListeners()
      await saveToStorage()

      return quizResult
    },
    [calculateResult]
  )

  // Получить результат квиза
  const getQuizResult = useCallback(
    (quizType: QuizType): QuizResult | null => {
      return state.results.find((r) => r.quizType === quizType) || null
    },
    [state.results]
  )

  // Удалить результат квиза
  const deleteQuizResult = useCallback(async (quizType: QuizType): Promise<void> => {
    quizState = {
      ...quizState,
      results: quizState.results.filter((r) => r.quizType !== quizType),
    }
    notifyListeners()
    await saveToStorage()
  }, [])

  // Получить описание результата
  const getResultDescription = useCallback((quizType: QuizType, result: string) => {
    switch (quizType) {
      case 'style':
        return STYLE_CONFIG[result as StyleType]
      case 'colorType':
        return COLOR_TYPE_CONFIG[result as ColorType]
      case 'dress':
        return DRESS_STYLE_CONFIG[result as DressStyle]
    }
  }, [])

  return {
    results: state.results,
    isLoading,
    getQuizQuestions,
    calculateResult,
    saveQuizResult,
    getQuizResult,
    deleteQuizResult,
    getResultDescription,
    // Конфигурации для отображения
    styleConfig: STYLE_CONFIG,
    colorTypeConfig: COLOR_TYPE_CONFIG,
    dressStyleConfig: DRESS_STYLE_CONFIG,
  }
}
