'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

// Типы уроков
export type LessonType = 'text' | 'quiz' | 'exercise'

// Интерфейс урока
export interface Lesson {
  id: string
  title: string
  type: LessonType
  duration: number // минут
  content: string // Markdown для text, JSON для quiz
  quizQuestions?: QuizQuestion[]
  exerciseTask?: string
}

// Вопрос квиза в уроке
export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

// Интерфейс курса
export interface Course {
  id: string
  title: string
  description: string
  emoji: string
  category: CourseCategory
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  totalDuration: number // минут
  lessons: Lesson[]
  certificate: boolean
}

export type CourseCategory = 'basics' | 'colors' | 'wardrobe' | 'care' | 'accessories' | 'shopping'

// Конфигурация категорий курсов
export const COURSE_CATEGORY_CONFIG: Record<
  CourseCategory,
  {
    name: string
    emoji: string
  }
> = {
  basics: { name: 'Основы стиля', emoji: '📚' },
  colors: { name: 'Цвета и сочетания', emoji: '🎨' },
  wardrobe: { name: 'Гардероб', emoji: '👗' },
  care: { name: 'Уход за одеждой', emoji: '🧼' },
  accessories: { name: 'Аксессуары', emoji: '👜' },
  shopping: { name: 'Умный шопинг', emoji: '🛍️' },
}

// Демо-курсы
export const DEMO_COURSES: Course[] = [
  {
    id: 'capsule-wardrobe',
    title: 'Капсульный гардероб: от А до Я',
    description: 'Научитесь составлять идеальный капсульный гардероб из минимума вещей',
    emoji: '👗',
    category: 'wardrobe',
    difficulty: 'beginner',
    totalDuration: 45,
    certificate: true,
    lessons: [
      {
        id: 'lesson-1',
        title: 'Что такое капсульный гардероб',
        type: 'text',
        duration: 8,
        content: `
# Что такое капсульный гардероб

Капсульный гардероб — это набор базовых вещей, которые идеально сочетаются друг с другом. Концепция была придумана владелицей лондонского бутика Сюзи Фокс в 1970-х годах.

## Основные принципы

1. **Минимализм** — меньше вещей, больше комбинаций
2. **Качество** — инвестируйте в качественные базовые вещи
3. **Универсальность** — каждая вещь сочетается минимум с 3 другими
4. **Ваш стиль** — только то, что вам действительно идёт

## Преимущества капсульного гардероба

- ✅ Экономия времени на сборы
- ✅ Экономия денег (покупаете меньше, но лучше)
- ✅ Меньше стресса при выборе одежды
- ✅ Всегда стильный вид
- ✅ Экологичный подход к моде

## Сколько вещей нужно?

Классическая капсула содержит **30-40 вещей**, включая обувь и верхнюю одежду. Но вы можете начать с мини-капсулы из 15-20 вещей.

В следующем уроке мы разберём, какие именно вещи должны быть в вашей капсуле.
`,
      },
      {
        id: 'lesson-2',
        title: 'Базовые вещи капсулы',
        type: 'text',
        duration: 10,
        content: `
# Базовые вещи капсульного гардероба

## Формула идеальной капсулы

Для сезонной капсулы из 30 вещей:

### Верх (12 вещей)
- 2 рубашки (белая и цветная/в полоску)
- 3 футболки/топа
- 2 блузы
- 2 свитера/джемпера
- 1 кардиган
- 2 водолазки (для холодного сезона)

### Низ (6 вещей)
- 2 пары джинсов (прямые и другого фасона)
- 2 пары брюк
- 2 юбки

### Платья (3 вещи)
- 1 повседневное платье
- 1 офисное платье
- 1 нарядное платье

### Верхняя одежда (4 вещи)
- 1 тренч/плащ
- 1 пальто
- 1 куртка
- 1 жакет/пиджак

### Обувь (5 пар)
- 1 кроссовки/кеды
- 1 туфли на каблуке
- 1 балетки/лоферы
- 1 ботильоны
- 1 сапоги (для холодного сезона)

## Правило 1:3

Каждая вещь должна сочетаться минимум с 3 другими вещами из вашего гардероба. Если не сочетается — она не нужна в капсуле.
`,
      },
      {
        id: 'lesson-3',
        title: 'Тест: Основы капсулы',
        type: 'quiz',
        duration: 5,
        content: 'Проверьте свои знания о капсульном гардеробе',
        quizQuestions: [
          {
            id: 'q1',
            question: 'Сколько вещей обычно входит в классическую капсулу?',
            options: ['10-15', '30-40', '50-60', '100+'],
            correctIndex: 1,
            explanation: 'Классическая капсула содержит 30-40 вещей, включая обувь и верхнюю одежду.',
          },
          {
            id: 'q2',
            question: 'С каким минимальным количеством вещей должна сочетаться каждая вещь в капсуле?',
            options: ['1', '2', '3', '5'],
            correctIndex: 2,
            explanation: 'Правило 1:3 — каждая вещь сочетается минимум с 3 другими.',
          },
          {
            id: 'q3',
            question: 'Кто придумал концепцию капсульного гардероба?',
            options: ['Коко Шанель', 'Сюзи Фокс', 'Донна Каран', 'Джорджио Армани'],
            correctIndex: 1,
            explanation: 'Концепция была создана Сюзи Фокс, владелицей лондонского бутика, в 1970-х годах.',
          },
        ],
      },
      {
        id: 'lesson-4',
        title: 'Цветовая палитра капсулы',
        type: 'text',
        duration: 8,
        content: `
# Цветовая палитра капсульного гардероба

Правильно подобранная цветовая палитра — ключ к тому, чтобы все вещи сочетались между собой.

## Формула цветов: 60-30-10

- **60% — базовые нейтральные цвета**
- **30% — дополнительные цвета**
- **10% — акцентные яркие цвета**

## Базовые цвета (60%)

Выберите 2-3 нейтральных цвета:
- Чёрный
- Белый
- Серый
- Бежевый
- Тёмно-синий
- Коричневый

## Дополнительные цвета (30%)

Выберите 2-3 цвета, которые вам идут:
- Должны сочетаться с базовыми
- Подходить вашему цветотипу
- Нравиться вам

## Акцентные цвета (10%)

1-2 ярких цвета для настроения:
- Красный
- Жёлтый
- Изумрудный
- Фуксия

## Пример палитры

**Тёплая палитра:**
- Базовые: бежевый, коричневый, хаки
- Дополнительные: терракотовый, горчичный
- Акцент: коралловый

**Холодная палитра:**
- Базовые: серый, тёмно-синий, белый
- Дополнительные: голубой, лавандовый
- Акцент: фуксия
`,
      },
      {
        id: 'lesson-5',
        title: 'Практика: Составьте свою капсулу',
        type: 'exercise',
        duration: 14,
        content: 'Практическое задание по составлению капсулы',
        exerciseTask: `
## Задание: Составьте свою мини-капсулу

Составьте список из 15 вещей для своей первой мини-капсулы.

### Шаг 1: Определите цветовую палитру
- 2 базовых цвета: _______________
- 2 дополнительных цвета: _______________
- 1 акцентный цвет: _______________

### Шаг 2: Выберите вещи

**Верх (6 вещей):**
1. _______________
2. _______________
3. _______________
4. _______________
5. _______________
6. _______________

**Низ (3 вещи):**
1. _______________
2. _______________
3. _______________

**Платья (2 вещи):**
1. _______________
2. _______________

**Верхняя одежда (2 вещи):**
1. _______________
2. _______________

**Обувь (2 пары):**
1. _______________
2. _______________

### Шаг 3: Проверьте
Убедитесь, что каждая вещь сочетается минимум с 3 другими!
`,
      },
    ],
  },
  {
    id: 'color-combinations',
    title: 'Цветовые сочетания в одежде',
    description: 'Узнайте, как правильно сочетать цвета и создавать гармоничные образы',
    emoji: '🎨',
    category: 'colors',
    difficulty: 'beginner',
    totalDuration: 35,
    certificate: true,
    lessons: [
      {
        id: 'color-1',
        title: 'Цветовой круг',
        type: 'text',
        duration: 7,
        content: `
# Цветовой круг — основа сочетания цветов

Цветовой круг — главный инструмент для подбора гармоничных сочетаний.

## Первичные цвета
- Красный
- Жёлтый
- Синий

## Вторичные цвета
Получаются при смешивании первичных:
- Оранжевый (красный + жёлтый)
- Зелёный (жёлтый + синий)
- Фиолетовый (синий + красный)

## Третичные цвета
Смешивание первичных и вторичных:
- Красно-оранжевый
- Жёлто-оранжевый
- Жёлто-зелёный
- Сине-зелёный
- Сине-фиолетовый
- Красно-фиолетовый

## Температура цветов

**Тёплые цвета:** красный, оранжевый, жёлтый
**Холодные цвета:** синий, зелёный, фиолетовый

Понимание температуры помогает создавать гармоничные образы.
`,
      },
      {
        id: 'color-2',
        title: 'Схемы сочетания цветов',
        type: 'text',
        duration: 10,
        content: `
# Схемы сочетания цветов

## 1. Монохроматическая схема
Один цвет в разных оттенках и насыщенности.

**Пример:** тёмно-синий пиджак + голубая рубашка + синие джинсы

✅ Всегда гармонично
✅ Выглядит элегантно
⚠️ Может быть скучным — добавьте текстуры

## 2. Комплементарная (контрастная)
Противоположные цвета на цветовом круге.

**Примеры:**
- Синий + оранжевый
- Красный + зелёный
- Жёлтый + фиолетовый

✅ Яркий, эффектный образ
⚠️ Используйте один цвет как основной, другой как акцент

## 3. Аналоговая схема
Соседние цвета на круге.

**Примеры:**
- Синий + сине-зелёный + зелёный
- Красный + оранжевый + жёлтый

✅ Мягкое, гармоничное сочетание
✅ Легко составить образ

## 4. Триада
Три цвета на равном расстоянии друг от друга.

**Примеры:**
- Красный + жёлтый + синий
- Оранжевый + зелёный + фиолетовый

✅ Живой, динамичный образ
⚠️ Сложнее в исполнении — один цвет основной, два акцентных

## 5. Нейтральные + акцент
Базовые нейтральные цвета + один яркий.

**Примеры:**
- Чёрный + белый + красный
- Серый + бежевый + изумрудный

✅ Универсальная схема
✅ Подходит для начинающих
`,
      },
      {
        id: 'color-3',
        title: 'Тест: Цветовые сочетания',
        type: 'quiz',
        duration: 5,
        content: 'Проверьте знания о сочетании цветов',
        quizQuestions: [
          {
            id: 'cq1',
            question: 'Какие цвета являются комплементарными (контрастными)?',
            options: ['Красный и оранжевый', 'Синий и зелёный', 'Синий и оранжевый', 'Жёлтый и зелёный'],
            correctIndex: 2,
            explanation: 'Комплементарные цвета находятся напротив друг друга на цветовом круге.',
          },
          {
            id: 'cq2',
            question: 'Какая схема использует один цвет в разных оттенках?',
            options: ['Триада', 'Монохроматическая', 'Аналоговая', 'Комплементарная'],
            correctIndex: 1,
            explanation: 'Монохроматическая схема — это один цвет в разных оттенках и насыщенности.',
          },
          {
            id: 'cq3',
            question: 'Какие цвета относятся к тёплым?',
            options: [
              'Синий, зелёный, фиолетовый',
              'Красный, оранжевый, жёлтый',
              'Белый, серый, чёрный',
              'Все яркие цвета',
            ],
            correctIndex: 1,
            explanation: 'Тёплые цвета — красный, оранжевый, жёлтый и их оттенки.',
          },
        ],
      },
      {
        id: 'color-4',
        title: 'Цвета для вашего цветотипа',
        type: 'text',
        duration: 8,
        content: `
# Цвета для разных цветотипов

## Весна (тёплый светлый)
**Лучшие цвета:**
- Коралловый, персиковый, лососевый
- Тёплый бежевый, золотистый
- Аквамарин, бирюзовый
- Яркий зелёный

**Избегать:** чёрный, холодный серый, холодный розовый

## Лето (холодный светлый)
**Лучшие цвета:**
- Пыльная роза, лавандовый, сиреневый
- Серо-голубой, мятный
- Малиновый, вишнёвый

**Избегать:** оранжевый, ярко-жёлтый, терракотовый

## Осень (тёплый тёмный)
**Лучшие цвета:**
- Терракотовый, кирпичный, ржавый
- Горчичный, оливковый, хаки
- Коричневый, бордовый

**Избегать:** холодный розовый, серый, голубой

## Зима (холодный тёмный)
**Лучшие цвета:**
- Чёрный, белоснежный
- Ярко-красный, фуксия
- Изумрудный, королевский синий
- Ледяной розовый

**Избегать:** тёплый бежевый, оранжевый, золотистый
`,
      },
      {
        id: 'color-5',
        title: 'Практика: Ваша цветовая палитра',
        type: 'exercise',
        duration: 5,
        content: 'Составьте свою цветовую палитру',
        exerciseTask: `
## Задание: Создайте свою цветовую палитру

### Шаг 1: Определите свой цветотип
Мой цветотип: _______________ (Весна/Лето/Осень/Зима)

### Шаг 2: Выберите базовые цвета (3 цвета)
1. _______________
2. _______________
3. _______________

### Шаг 3: Выберите дополнительные цвета (2 цвета)
1. _______________
2. _______________

### Шаг 4: Выберите акцентный цвет (1 цвет)
1. _______________

### Шаг 5: Проверка
Все ли выбранные цвета подходят вашему цветотипу?
Сочетаются ли они между собой?
`,
      },
    ],
  },
  {
    id: 'clothing-care',
    title: 'Уход за одеждой: продлеваем жизнь вещам',
    description: 'Как правильно стирать, хранить и ухаживать за разными тканями',
    emoji: '🧼',
    category: 'care',
    difficulty: 'beginner',
    totalDuration: 30,
    certificate: false,
    lessons: [
      {
        id: 'care-1',
        title: 'Расшифровка ярлыков',
        type: 'text',
        duration: 8,
        content: `
# Как читать ярлыки на одежде

## Символы стирки 🧺

**Тазик с водой** — можно стирать
- Цифра внутри = максимальная температура
- Рука = только ручная стирка
- Крест = стирать нельзя

**Линии под тазиком:**
- Одна линия = деликатная стирка
- Две линии = очень деликатная

## Символы отбеливания △

- Пустой треугольник = можно отбеливать
- Треугольник с полосками = без хлора
- Перечёркнутый = отбеливать нельзя

## Символы сушки ⬜

- Квадрат с кругом = можно в сушилке
- Точки = температура (больше точек = выше t°)
- Крест = сушилка запрещена

## Символы глажки 🔥

- Утюг = можно гладить
- Точки внутри = температура
  - 1 точка = до 110°C (синтетика)
  - 2 точки = до 150°C (шерсть, шёлк)
  - 3 точки = до 200°C (хлопок, лён)
- Крест = гладить нельзя

## Химчистка ⭕

- Круг = можно в химчистку
- Буквы внутри = тип чистки
- Крест = химчистка запрещена
`,
      },
      {
        id: 'care-2',
        title: 'Уход за разными тканями',
        type: 'text',
        duration: 10,
        content: `
# Уход за разными тканями

## Хлопок

**Стирка:** 40-60°C, можно в машинке
**Сушка:** можно в сушилке
**Глажка:** высокая температура, можно с паром
**Совет:** стирайте цветной хлопок при 40°C, чтобы сохранить цвет

## Шерсть

**Стирка:** 30°C, деликатный режим или вручную
**Сушка:** только горизонтально, не вешать
**Глажка:** через ткань, с паром
**Совет:** используйте специальное средство для шерсти

## Шёлк

**Стирка:** 30°C, вручную или деликатный режим
**Сушка:** горизонтально, в тени
**Глажка:** слегка влажным, низкая температура
**Совет:** добавьте уксус при полоскании для блеска

## Синтетика (полиэстер, нейлон)

**Стирка:** 40°C, обычный режим
**Сушка:** можно в сушилке на низкой t°
**Глажка:** низкая температура, без пара
**Совет:** стирайте вывернутой наизнанку

## Лён

**Стирка:** 40-60°C, можно в машинке
**Сушка:** расправить и сушить на плечиках
**Глажка:** высокая температура, слегка влажным
**Совет:** лён любит воду, стирайте часто

## Джинсовая ткань

**Стирка:** 40°C, вывернуть наизнанку
**Сушка:** на воздухе, не в сушилке
**Глажка:** обычно не требуется
**Совет:** стирайте как можно реже, чтобы сохранить цвет
`,
      },
      {
        id: 'care-3',
        title: 'Тест: Уход за одеждой',
        type: 'quiz',
        duration: 5,
        content: 'Проверьте знания об уходе за одеждой',
        quizQuestions: [
          {
            id: 'careq1',
            question: 'При какой температуре лучше стирать шерсть?',
            options: ['60°C', '40°C', '30°C', 'Только химчистка'],
            correctIndex: 2,
            explanation: 'Шерсть стирают при 30°C на деликатном режиме, чтобы она не села.',
          },
          {
            id: 'careq2',
            question: 'Что означают 3 точки на символе утюга?',
            options: ['Нельзя гладить', 'Низкая температура', 'Средняя температура', 'Высокая температура (до 200°C)'],
            correctIndex: 3,
            explanation: 'Три точки — высокая температура, подходит для хлопка и льна.',
          },
          {
            id: 'careq3',
            question: 'Как лучше сушить шёлковые вещи?',
            options: ['В сушилке', 'На батарее', 'Горизонтально в тени', 'На солнце'],
            correctIndex: 2,
            explanation: 'Шёлк сушат горизонтально в тени, чтобы не повредить волокна.',
          },
        ],
      },
      {
        id: 'care-4',
        title: 'Хранение одежды',
        type: 'text',
        duration: 7,
        content: `
# Правильное хранение одежды

## Общие правила

1. **Чистота** — храните только чистую одежду
2. **Сухость** — убедитесь, что вещи полностью высохли
3. **Проветривание** — шкаф должен проветриваться
4. **Порядок** — не перегружайте шкаф

## Что вешать на плечики

✅ Пиджаки и жакеты
✅ Платья
✅ Рубашки и блузы
✅ Пальто и верхняя одежда

**Важно:** используйте подходящие плечики!
- Деревянные — для тяжёлых вещей
- Мягкие — для деликатных тканей
- С перекладиной — для брюк

## Что складывать

✅ Футболки и майки
✅ Свитера и кардиганы (чтобы не вытягивались)
✅ Джинсы
✅ Нижнее бельё

## Сезонное хранение

- Постирайте всё перед хранением
- Используйте чехлы для одежды (тканевые, не полиэтиленовые!)
- Добавьте средства от моли (лаванда, кедр)
- Храните в сухом, тёмном месте

## Хранение обуви

- Используйте формодержатели
- Храните в коробках или органайзерах
- Не храните влажную обувь
- Обрабатывайте кремом перед хранением
`,
      },
    ],
  },
  {
    id: 'accessories-guide',
    title: 'Аксессуары: как носить правильно',
    description: 'Всё об украшениях, сумках, шарфах и других аксессуарах',
    emoji: '👜',
    category: 'accessories',
    difficulty: 'intermediate',
    totalDuration: 25,
    certificate: false,
    lessons: [
      {
        id: 'acc-1',
        title: 'Правила выбора аксессуаров',
        type: 'text',
        duration: 8,
        content: `
# Правила выбора аксессуаров

## Золотое правило

**Снимите один аксессуар перед выходом** — совет Коко Шанель, актуальный и сегодня.

## Принципы подбора

### 1. Масштаб
Аксессуары должны соответствовать вашему телосложению:
- Миниатюрным — небольшие, изящные украшения
- Крупным — более массивные аксессуары
- Высоким — можно всё!

### 2. Стиль
Аксессуары должны соответствовать стилю образа:
- Классический образ → жемчуг, золото, структурированная сумка
- Casual → простые украшения, рюкзак, кеды
- Романтический → цветочные мотивы, нежные ткани

### 3. Случай
- Офис → сдержанные аксессуары
- Вечер → можно ярче и смелее
- Повседневность → комфорт + стиль

## Правило трёх

Носите не более **трёх** заметных аксессуаров одновременно:
- Часы + серьги + кольцо ✅
- Часы + браслет + ожерелье + серьги + 5 колец ❌

## Металлы

**Тёплый подтон кожи** → золото, медь, бронза
**Холодный подтон кожи** → серебро, платина, белое золото

Можно смешивать металлы, но один должен доминировать.
`,
      },
      {
        id: 'acc-2',
        title: 'Сумки: как выбрать идеальную',
        type: 'text',
        duration: 8,
        content: `
# Как выбрать идеальную сумку

## Базовые сумки в гардеробе

1. **Тоут** — большая сумка для работы и повседневности
2. **Кросс-боди** — маленькая сумка на длинном ремне
3. **Клатч** — для вечерних выходов
4. **Рюкзак** — для активного образа жизни

## Как выбрать размер

**Миниатюрным:** небольшие сумки, короткие ручки
**Высоким:** могут носить любой размер
**Полным:** избегайте очень маленьких сумок

## Где носить сумку

Сумка на ремне акцентирует ту часть тела, на уровне которой находится:
- На бедре → акцент на бёдрах
- На талии → акцент на талии
- У груди → акцент на груди

## Цвет сумки

**Нейтральные** (чёрный, коричневый, бежевый) — универсальны
**Яркие** — акцент образа, сочетайте с другими аксессуарами

## Качество vs Количество

Лучше иметь 3-4 качественные сумки, чем 10 дешёвых:
- Натуральная кожа служит годами
- Качественная фурнитура не облезает
- Классические модели не выходят из моды
`,
      },
      {
        id: 'acc-3',
        title: 'Шарфы и платки',
        type: 'text',
        duration: 5,
        content: `
# Шарфы и платки: универсальный аксессуар

## 10 способов носить шарф

1. **Классический узел** — сложить пополам, продеть концы в петлю
2. **Парижский** — обернуть вокруг шеи, концы свободно
3. **На голову** — как повязка или бандана
4. **На сумку** — привязать к ручке
5. **Как пояс** — вместо ремня на брюках или платье
6. **Как топ** — для смелых!
7. **На запястье** — как браслет
8. **Французский узел** — сложить по диагонали, узел сбоку
9. **Водопад** — длинный шарф, концы свисают спереди
10. **Капюшон** — большой шарф как накидка на голову

## Ткани для разных сезонов

**Зима:** шерсть, кашемир, крупная вязка
**Осень/Весна:** хлопок, тонкая шерсть
**Лето:** шёлк, лён, лёгкий хлопок

## Размеры

- **Шарф:** 30-50 см × 180-200 см
- **Платок:** 70×70 см или 90×90 см
- **Палантин:** 70-100 см × 180-200 см
`,
      },
      {
        id: 'acc-4',
        title: 'Тест: Аксессуары',
        type: 'quiz',
        duration: 4,
        content: 'Проверьте знания об аксессуарах',
        quizQuestions: [
          {
            id: 'accq1',
            question: 'Сколько заметных аксессуаров рекомендуется носить одновременно?',
            options: ['1', '3', '5', 'Без ограничений'],
            correctIndex: 1,
            explanation: 'Правило трёх — не более 3 заметных аксессуаров одновременно.',
          },
          {
            id: 'accq2',
            question: 'Какой металл подходит для тёплого подтона кожи?',
            options: ['Серебро', 'Платина', 'Золото', 'Белое золото'],
            correctIndex: 2,
            explanation: 'Для тёплого подтона подходят золото, медь, бронза.',
          },
        ],
      },
    ],
  },
]

// Прогресс пользователя
export interface UserProgress {
  coursesProgress: Record<string, CourseProgress>
  completedCourses: string[]
  dailyTips: DailyTip[]
  lastDailyTip?: string // ID последнего показанного совета
}

export interface CourseProgress {
  courseId: string
  startedAt: Date
  completedLessons: string[]
  quizScores: Record<string, number> // lessonId -> score (0-100)
  exerciseCompleted: Record<string, boolean>
  completedAt?: Date
}

export interface DailyTip {
  id: string
  text: string
  category: string
  shown: boolean
  shownAt?: Date
}

// Ежедневные советы
export const DAILY_TIPS: Omit<DailyTip, 'shown' | 'shownAt'>[] = [
  {
    id: 'tip1',
    text: 'Белая рубашка — must-have в любом гардеробе. Она сочетается практически со всем!',
    category: 'wardrobe',
  },
  { id: 'tip2', text: 'Правило трёх: носите не более 3 заметных аксессуаров одновременно.', category: 'accessories' },
  { id: 'tip3', text: 'Стирайте джинсы как можно реже — это сохранит их цвет и форму.', category: 'care' },
  { id: 'tip4', text: 'Шёлк любит прохладную воду и нежное обращение. Не выкручивайте!', category: 'care' },
  { id: 'tip5', text: 'Монохромный образ всегда выглядит стильно и элегантно.', category: 'colors' },
  { id: 'tip6', text: 'Качественные базовые вещи — лучшая инвестиция в гардероб.', category: 'shopping' },
  { id: 'tip7', text: 'Каждая вещь в капсуле должна сочетаться минимум с 3 другими.', category: 'wardrobe' },
  { id: 'tip8', text: 'Правильная обувь делает образ. Не экономьте на обуви!', category: 'shopping' },
  {
    id: 'tip9',
    text: 'Шарф может полностью изменить образ. Экспериментируйте со способами завязывания.',
    category: 'accessories',
  },
  { id: 'tip10', text: 'Перед покупкой спросите себя: с чем я буду это носить?', category: 'shopping' },
]

// Ключ для IndexedDB
const LEARNING_STORAGE_KEY = 'premium-rosstil-learning'

// Глобальное состояние
let learningState: UserProgress = {
  coursesProgress: {},
  completedCourses: [],
  dailyTips: [],
}
const listeners: Set<() => void> = new Set()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

// Загрузка из IndexedDB
const loadFromStorage = async (): Promise<void> => {
  try {
    const stored = await get<UserProgress>(LEARNING_STORAGE_KEY)
    if (stored) {
      learningState = stored
      notifyListeners()
    }
  } catch (error) {
    console.error('Ошибка загрузки прогресса обучения:', error)
  }
}

// Сохранение в IndexedDB
const saveToStorage = async (): Promise<void> => {
  try {
    await set(LEARNING_STORAGE_KEY, learningState)
  } catch (error) {
    console.error('Ошибка сохранения прогресса обучения:', error)
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
export function __resetLearningState() {
  learningState = {
    coursesProgress: {},
    completedCourses: [],
    dailyTips: [],
  }
  initialized = false
  listeners.clear()
}

/**
 * Установка начального состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __setLearningState(state: UserProgress) {
  learningState = state
  listeners.forEach((l) => l())
}

/**
 * Хук для работы с обучающим контентом
 */
export function useLearning() {
  const [isLoading, setIsLoading] = useState(true)

  // Подписка на изменения состояния
  const state = useSyncExternalStore(
    (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    () => learningState,
    () => learningState
  )

  useEffect(() => {
    initialize()
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  // Получить все курсы
  const getAllCourses = useCallback((): Course[] => {
    return DEMO_COURSES
  }, [])

  // Получить курс по ID
  const getCourseById = useCallback((courseId: string): Course | null => {
    return DEMO_COURSES.find((c) => c.id === courseId) || null
  }, [])

  // Получить прогресс курса
  const getCourseProgress = useCallback(
    (courseId: string): CourseProgress | null => {
      return state.coursesProgress[courseId] || null
    },
    [state.coursesProgress]
  )

  // Начать курс
  const startCourse = useCallback(
    async (courseId: string): Promise<void> => {
      if (!state.coursesProgress[courseId]) {
        learningState = {
          ...learningState,
          coursesProgress: {
            ...learningState.coursesProgress,
            [courseId]: {
              courseId,
              startedAt: new Date(),
              completedLessons: [],
              quizScores: {},
              exerciseCompleted: {},
            },
          },
        }
        notifyListeners()
        await saveToStorage()
      }
    },
    [state.coursesProgress]
  )

  // Завершить урок
  const completeLesson = useCallback(
    async (courseId: string, lessonId: string): Promise<void> => {
      const progress = learningState.coursesProgress[courseId]
      if (progress && !progress.completedLessons.includes(lessonId)) {
        const updatedProgress = {
          ...progress,
          completedLessons: [...progress.completedLessons, lessonId],
        }

        // Проверить завершение курса
        const course = getCourseById(courseId)
        if (course && updatedProgress.completedLessons.length === course.lessons.length) {
          updatedProgress.completedAt = new Date()
          learningState = {
            ...learningState,
            completedCourses: [...learningState.completedCourses, courseId],
          }
        }

        learningState = {
          ...learningState,
          coursesProgress: {
            ...learningState.coursesProgress,
            [courseId]: updatedProgress,
          },
        }
        notifyListeners()
        await saveToStorage()
      }
    },
    [getCourseById]
  )

  // Сохранить результат квиза
  const saveQuizScore = useCallback(async (courseId: string, lessonId: string, score: number): Promise<void> => {
    const progress = learningState.coursesProgress[courseId]
    if (progress) {
      learningState = {
        ...learningState,
        coursesProgress: {
          ...learningState.coursesProgress,
          [courseId]: {
            ...progress,
            quizScores: {
              ...progress.quizScores,
              [lessonId]: score,
            },
          },
        },
      }
      notifyListeners()
      await saveToStorage()
    }
  }, [])

  // Отметить упражнение выполненным
  const completeExercise = useCallback(async (courseId: string, lessonId: string): Promise<void> => {
    const progress = learningState.coursesProgress[courseId]
    if (progress) {
      learningState = {
        ...learningState,
        coursesProgress: {
          ...learningState.coursesProgress,
          [courseId]: {
            ...progress,
            exerciseCompleted: {
              ...progress.exerciseCompleted,
              [lessonId]: true,
            },
          },
        },
      }
      notifyListeners()
      await saveToStorage()
    }
  }, [])

  // Вычислить процент прохождения курса
  const getCourseCompletionPercent = useCallback(
    (courseId: string): number => {
      const course = getCourseById(courseId)
      const progress = state.coursesProgress[courseId]
      if (!course || !progress) {
        return 0
      }
      return Math.round((progress.completedLessons.length / course.lessons.length) * 100)
    },
    [getCourseById, state.coursesProgress]
  )

  // Проверить пройден ли курс
  const isCourseCompleted = useCallback(
    (courseId: string): boolean => {
      return state.completedCourses.includes(courseId)
    },
    [state.completedCourses]
  )

  // Проверить начат ли курс
  const isCourseStarted = useCallback(
    (courseId: string): boolean => {
      return !!state.coursesProgress[courseId]
    },
    [state.coursesProgress]
  )

  // Получить ежедневный совет
  const getDailyTip = useCallback((): DailyTip | null => {
    const today = new Date().toDateString()

    // Проверить, показывали ли уже совет сегодня
    const shownToday = learningState.dailyTips.find((t) => t.shownAt && new Date(t.shownAt).toDateString() === today)
    if (shownToday) {
      return shownToday
    }

    // Найти непоказанный совет
    const shownIds = learningState.dailyTips.map((t) => t.id)
    const unshown = DAILY_TIPS.filter((t) => !shownIds.includes(t.id))

    if (unshown.length === 0) {
      // Все советы показаны, начать сначала
      return DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)] as DailyTip
    }

    const tip = unshown[Math.floor(Math.random() * unshown.length)]
    return { ...tip, shown: false }
  }, [])

  // Отметить совет как показанный
  const markTipShown = useCallback(async (tipId: string): Promise<void> => {
    const existingIndex = learningState.dailyTips.findIndex((t) => t.id === tipId)
    const newTip: DailyTip = {
      ...(DAILY_TIPS.find((t) => t.id === tipId) || { id: tipId, text: '', category: '' }),
      shown: true,
      shownAt: new Date(),
    }

    if (existingIndex >= 0) {
      learningState.dailyTips[existingIndex] = newTip
    } else {
      learningState.dailyTips.push(newTip)
    }

    learningState = { ...learningState }
    notifyListeners()
    await saveToStorage()
  }, [])

  // Получить статистику
  const getStats = useCallback(() => {
    const completedCoursesCount = state.completedCourses.length
    const startedCoursesCount = Object.keys(state.coursesProgress).length
    const totalLessonsCompleted = Object.values(state.coursesProgress).reduce(
      (sum, p) => sum + p.completedLessons.length,
      0
    )

    return {
      completedCourses: completedCoursesCount,
      startedCourses: startedCoursesCount,
      totalLessonsCompleted,
      totalCourses: DEMO_COURSES.length,
    }
  }, [state.completedCourses, state.coursesProgress])

  return {
    courses: getAllCourses(),
    completedCourses: state.completedCourses,
    isLoading,
    getAllCourses,
    getCourseById,
    getCourseProgress,
    startCourse,
    completeLesson,
    saveQuizScore,
    completeExercise,
    getCourseCompletionPercent,
    isCourseCompleted,
    isCourseStarted,
    getDailyTip,
    markTipShown,
    getStats,
    categoryConfig: COURSE_CATEGORY_CONFIG,
  }
}
