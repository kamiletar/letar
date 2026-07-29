// Помощник по гармонии: лады и диатонические аккорды через ощущение, не через сухую теорию.
// Ear-first: у каждого лада — физическая/эмоциональная метафора как основной ярлык, музыкальное
// имя — вторично (мелким текстом в UI). Аккорды каждой ступени выводятся стеканием терций
// внутри лада (структурно, без хардкода на конкретный лад) — тот же приём, что уже применён
// к 32 алгоритмам DX7 (dx7-algorithms.ts): один универсальный алгоритм вместо таблицы на каждый случай.

export interface ScaleDef {
  label: string // ear-first: физическая/эмоциональная метафора
  theoryName: string // формальное имя лада (вторично в UI)
  description: string // подсказка-метафора в духе hints.ts
  intervals: number[] // полутона от корня внутри одной октавы, по возрастанию, первый — 0
}

export const SCALE_IDS = ['pentatonic-minor', 'natural-minor', 'dorian', 'phrygian', 'harmonic-minor', 'major'] as const
export type ScaleId = (typeof SCALE_IDS)[number]

export const SCALES: Record<ScaleId, ScaleDef> = {
  'pentatonic-minor': {
    label: 'Просто, без промахов',
    theoryName: 'минорная пентатоника',
    description: 'Пять нот, среди которых не ошибёшься — блюзовый костяк, как труба выдувает фразу без запинки.',
    intervals: [0, 3, 5, 7, 10],
  },
  'natural-minor': {
    label: 'Тёмный, тревожный',
    theoryName: 'натуральный минор',
    description: 'Сумрак и тяжесть — как гул диджериду в закрытом помещении.',
    intervals: [0, 2, 3, 5, 7, 8, 10],
  },
  dorian: {
    label: 'Задумчивый, с проблеском',
    theoryName: 'дорийский лад',
    description: 'Минорный сумрак с одним светлым лучом — варган, который вдруг зазвенел ярче.',
    intervals: [0, 2, 3, 5, 7, 9, 10],
  },
  phrygian: {
    label: 'Острый, восточный',
    theoryName: 'фригийский лад',
    description: 'Полутон сразу после корня — резкий укол, шаманский бубен с надрывом.',
    intervals: [0, 1, 3, 5, 7, 8, 10],
  },
  'harmonic-minor': {
    label: 'Драматичный, с изломом',
    theoryName: 'гармонический минор',
    description: 'Тёмный минор с неожиданно острым краем ближе к вершине — трагический излом.',
    intervals: [0, 2, 3, 5, 7, 8, 11],
  },
  major: {
    label: 'Светлый, открытый',
    theoryName: 'мажор',
    description: 'Простор и свет — открытое поле после долгого гула.',
    intervals: [0, 2, 4, 5, 7, 9, 11],
  },
}

/** Классы высоты (0-11), принадлежащие ладу от заданного корня — для подсветки, безотносительно октавы. */
export function getScalePitchClasses(root: number, intervals: number[]): Set<number> {
  return new Set(intervals.map((i) => (((root + i) % 12) + 12) % 12))
}

/** Все MIDI-ноты лада в диапазоне [rangeStart, rangeEnd] включительно, по возрастанию. */
export function getScaleNotes(root: number, intervals: number[], rangeStart: number, rangeEnd: number): number[] {
  const classes = getScalePitchClasses(root, intervals)
  const notes: number[] = []
  for (let n = rangeStart; n <= rangeEnd; n++) {
    if (classes.has(((n % 12) + 12) % 12)) {
      notes.push(n)
    }
  }
  return notes
}

export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented'

// Ear-first ярлыки для качества аккорда — те же физические/эмоциональные слова, что и у ладов.
export const QUALITY_LABEL: Record<ChordQuality, string> = {
  major: 'светлый',
  minor: 'тёмный',
  diminished: 'напряжённый, готов сорваться',
  augmented: 'зависший, неустойчивый',
}

export interface DiatonicChord {
  degree: number // ступень лада, 1-based
  notes: number[] // MIDI-ноты трезвучия (корень, терция, квинта)
  quality: ChordQuality
}

function qualityFromIntervals(third: number, fifth: number): ChordQuality {
  if (third === 4 && fifth === 7) {
    return 'major'
  }
  if (third === 3 && fifth === 7) {
    return 'minor'
  }
  if (third === 3 && fifth === 6) {
    return 'diminished'
  }
  if (third === 4 && fifth === 8) {
    return 'augmented'
  }
  // Нестандартный интервал (в наших ладах не встречается, но не должно падать) — грубая эвристика.
  return third <= 3 ? 'minor' : 'major'
}

/**
 * Трезвучия на каждой ступени лада — стекание терций (ступень, ступень+2, ступень+4) внутри
 * самого лада, а не по хроматической гамме. Работает для любого 7-тонового лада без хардкода
 * под конкретное имя (натуральный минор/мажор/etc — один и тот же код). Для ладов другой длины
 * (например, пентатоники) диатонические трезвучия не определены — возвращает пустой массив.
 */
export function getDiatonicChords(root: number, intervals: number[]): DiatonicChord[] {
  const len = intervals.length
  if (len !== 7) {
    return []
  }
  const stepSemitone = (i: number) => intervals[i % len] + 12 * Math.floor(i / len)

  const chords: DiatonicChord[] = []
  for (let degree = 0; degree < len; degree++) {
    const rootSemi = stepSemitone(degree)
    const thirdSemi = stepSemitone(degree + 2)
    const fifthSemi = stepSemitone(degree + 4)
    const third = thirdSemi - rootSemi
    const fifth = fifthSemi - rootSemi
    chords.push({
      degree: degree + 1,
      notes: [root + rootSemi, root + thirdSemi, root + fifthSemi],
      quality: qualityFromIntervals(third, fifth),
    })
  }
  return chords
}
