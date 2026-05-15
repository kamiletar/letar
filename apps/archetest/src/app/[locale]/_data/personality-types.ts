/** Код типа личности (10 базовых + 3 дополнительные) */
export type PersonalityTypeCode =
  | 'PAR'
  | 'SZD'
  | 'SZT'
  | 'ANT'
  | 'BOR'
  | 'HIS'
  | 'NAR'
  | 'AVD'
  | 'DEP'
  | 'OBC'
  | 'BAR'
  | 'PAG'
  | 'DPR'

/** Кластер типа личности */
export type PersonalityCluster = 'A' | 'B' | 'C' | 'mood' | 'additional'

/** Описание типа личности */
export interface PersonalityType {
  code: PersonalityTypeCode
  /** Мягкое название */
  label: string
  labelEn: string
  /** Клиническое название */
  clinical: string
  clinicalEn: string
  /** Архетип */
  archetype: string
  archetypeEn: string
  /** Описание */
  description: string
  descriptionEn: string
  /** Описание при высоком балле (≥40%) */
  whenHigh: string
  whenHighEn: string
  /** Цвет для графика */
  color: string
  /** Кластер: A (эксцентричные), B (драматичные), C (тревожные), mood (настроение), additional (дополнительные) */
  cluster: PersonalityCluster
}

/** 13 типов личности (10 базовых DSM-5 + 3 дополнительных) */
export const PERSONALITY_TYPES: PersonalityType[] = [
  // Кластер A — эксцентричные
  {
    code: 'PAR',
    label: 'Бдительный',
    labelEn: 'Vigilant',
    clinical: 'Параноидный',
    clinicalEn: 'Paranoid',
    archetype: 'Страж',
    archetypeEn: 'Guardian',
    description:
      'Вы склонны замечать скрытые мотивы и подтексты в поведении окружающих. Доверие для вас — не данность, а то, что нужно заслужить. Вы внимательны к деталям, которые другие пропускают, и ваша бдительность часто оказывается оправданной. Ваш круг близких узок, но крепок — тех, кого вы впустили, вы защищаете с полной преданностью.',
    descriptionEn:
      "You tend to notice hidden motives and subtexts in others' behavior. Trust is not given but earned. You pay attention to details others miss, and your vigilance is often justified. Your inner circle is small but strong — those you let in receive your full loyalty.",
    whenHigh:
      'Высокий балл по этой шкале говорит о выраженной настороженности в отношениях. Вам может быть сложно расслабиться в компании, вы часто анализируете чужие намерения. Это ценное качество в ситуациях, требующих бдительности, но в повседневной жизни может создавать напряжение.',
    whenHighEn:
      'A high score indicates pronounced wariness in relationships. You may find it hard to relax in company, often analyzing intentions. This is valuable when vigilance is needed, but may create tension in everyday life.',
    color: '#E53E3E',
    cluster: 'A',
  },
  {
    code: 'SZD',
    label: 'Самодостаточный',
    labelEn: 'Self-Reliant',
    clinical: 'Шизоидный',
    clinicalEn: 'Schizoid',
    archetype: 'Отшельник',
    archetypeEn: 'Hermit',
    description:
      'Вы самодостаточны и комфортно чувствуете себя в одиночестве. Ваш внутренний мир богат и насыщен — вы находите удовлетворение в мыслях, наблюдениях, интеллектуальных занятиях. Эмоции вы переживаете глубоко, но не считаете нужным демонстрировать их окружающим.',
    descriptionEn:
      'You are self-sufficient and comfortable in solitude. Your inner world is rich — you find satisfaction in thoughts, observations, and intellectual pursuits. You experience emotions deeply but see no need to display them.',
    whenHigh:
      'Высокий балл говорит о выраженной потребности в автономии и эмоциональной дистанции. Вы предпочитаете наблюдать, а не участвовать. Это даёт вам глубину и независимость, но может затруднять построение близких отношений.',
    whenHighEn:
      'A high score indicates a pronounced need for autonomy and emotional distance. You prefer observing over participating. This gives depth and independence but may complicate close relationships.',
    color: '#3182CE',
    cluster: 'A',
  },
  {
    code: 'SZT',
    label: 'Необычный',
    labelEn: 'Idiosyncratic',
    clinical: 'Шизотипический',
    clinicalEn: 'Schizotypal',
    archetype: 'Визионер',
    archetypeEn: 'Visionary',
    description:
      'Вы мыслите нестандартно и видите связи, которые ускользают от других. Ваше восприятие мира шире обычного — вы чувствительны к символам, совпадениям, скрытым смыслам. Интуиция для вас — не абстракция, а рабочий инструмент.',
    descriptionEn:
      'You think unconventionally and see connections others miss. Your perception is wider than most — you are sensitive to symbols, coincidences, and hidden meanings. Intuition is your working tool.',
    whenHigh:
      'Высокий балл указывает на выраженное нестандартное мышление и необычный опыт восприятия. Ваши идеи могут опережать время, но иногда граница между интуицией и домыслом размывается. Проверяйте свои догадки фактами.',
    whenHighEn:
      'A high score indicates pronounced unconventional thinking. Your ideas may be ahead of their time, but the boundary between intuition and speculation can blur. Verify your insights with facts.',
    color: '#805AD5',
    cluster: 'A',
  },
  // Кластер B — драматичные
  {
    code: 'ANT',
    label: 'Дерзкий',
    labelEn: 'Adventurous',
    clinical: 'Антисоциальный',
    clinicalEn: 'Antisocial',
    archetype: 'Бунтарь',
    archetypeEn: 'Rebel',
    description:
      'Вы действуете решительно и не боитесь идти против течения. Правила и условности не имеют над вами абсолютной власти — вы подчиняетесь только тому, что считаете разумным. Вы легко принимаете решения в условиях неопределённости.',
    descriptionEn:
      'You act decisively and are unafraid to go against the current. Rules and conventions hold no absolute power over you — you follow only what you find reasonable.',
    whenHigh:
      'Высокий балл говорит о выраженной независимости от социальных норм и склонности к риску. Это делает вас эффективным в кризисах, но может создавать конфликты. Обратите внимание на баланс между свободой и ответственностью.',
    whenHighEn:
      'A high score indicates pronounced independence from social norms and risk-taking. This makes you effective in crises but may create conflicts. Consider the balance between freedom and responsibility.',
    color: '#D69E2E',
    cluster: 'B',
  },
  {
    code: 'BOR',
    label: 'Эмоциональное',
    labelEn: 'Mercurial',
    clinical: 'Пограничный',
    clinicalEn: 'Borderline',
    archetype: 'Пламя',
    archetypeEn: 'Flame',
    description:
      'Вы переживаете эмоции с необычной интенсивностью — радость, любовь, гнев, боль ощущаются вами ярче, чем у большинства. Это делает вашу жизнь насыщенной и глубокой, а вас — невероятно чутким к чувствам других.',
    descriptionEn:
      "You experience emotions with unusual intensity — joy, love, anger, pain feel brighter for you than for most. This makes your life rich and deep, and you incredibly attuned to others' feelings.",
    whenHigh:
      'Высокий балл указывает на значительную эмоциональную интенсивность и чувствительность к отвержению. Сильные чувства — ваш ресурс, но важно развивать навыки эмоциональной регуляции.',
    whenHighEn:
      'A high score indicates significant emotional intensity and rejection sensitivity. Strong feelings are your resource, but developing emotional regulation skills is important.',
    color: '#E53E3E',
    cluster: 'B',
  },
  {
    code: 'HIS',
    label: 'Артистичное',
    labelEn: 'Dramatic',
    clinical: 'Гистрионный',
    clinicalEn: 'Histrionic',
    archetype: 'Солнце',
    archetypeEn: 'Sun',
    description:
      'Вы — природный коммуникатор с даром оживлять любую компанию. Выразительность, обаяние, эмоциональная открытость делают вас магнитом для людей. Вы умеете рассказывать истории так, что заслушивается каждый.',
    descriptionEn:
      'You are a natural communicator with a gift for enlivening any group. Expressiveness, charm, and emotional openness make you a magnet for people.',
    whenHigh:
      'Высокий балл говорит о выраженной потребности во внимании и эмоциональном отклике окружающих. Ваша яркость — дар, но важно убедиться, что за ней стоит настоящее содержание.',
    whenHighEn:
      'A high score indicates a pronounced need for attention and emotional response. Your brightness is a gift, but make sure genuine substance stands behind it.',
    color: '#DD6B20',
    cluster: 'B',
  },
  {
    code: 'NAR',
    label: 'Уверенный',
    labelEn: 'Self-Confident',
    clinical: 'Нарциссический',
    clinicalEn: 'Narcissistic',
    archetype: 'Факел',
    archetypeEn: 'Torch',
    description:
      'Вы обладаете сильной верой в свои способности и высокими стандартами. Амбициозность, стратегическое мышление и уверенность делают вас лидером по природе. Вы способны вдохновлять других масштабными идеями.',
    descriptionEn:
      'You have strong belief in your abilities and high standards. Ambition, strategic thinking, and confidence make you a natural leader who inspires others with grand ideas.',
    whenHigh:
      'Высокий балл указывает на выраженную потребность в восхищении и склонность ставить свои интересы выше чужих. Ваш главный ресурс роста — эмпатия.',
    whenHighEn:
      'A high score indicates a pronounced need for admiration and tendency to prioritize your interests. Your main growth resource is empathy.',
    color: '#38A169',
    cluster: 'B',
  },
  // Кластер C — тревожные
  {
    code: 'AVD',
    label: 'Чувствительная',
    labelEn: 'Sensitive',
    clinical: 'Избегающий',
    clinicalEn: 'Avoidant',
    archetype: 'Лань',
    archetypeEn: 'Deer',
    description:
      'Вы обладаете тонким эмоциональным восприятием — чувствуете нюансы, которые другие не замечают. Это делает вас чутким, внимательным к деталям и глубоко эмпатичным. Те, кто заслужил ваше доверие, получают искреннего, верного и заботливого друга.',
    descriptionEn:
      'You have a fine emotional perception — you sense nuances others miss. This makes you attentive, detail-oriented, and deeply empathic. Those who earn your trust gain a sincere, loyal friend.',
    whenHigh:
      'Высокий балл говорит о значительном страхе негативной оценки и склонности избегать ситуаций, где возможно отвержение. Помните: мир не так критичен к вам, как вам кажется.',
    whenHighEn:
      'A high score indicates significant fear of negative evaluation. Remember: the world is not as critical of you as you think.',
    color: '#319795',
    cluster: 'C',
  },
  {
    code: 'DEP',
    label: 'Преданный',
    labelEn: 'Devoted',
    clinical: 'Зависимый',
    clinicalEn: 'Dependent',
    archetype: 'Хранитель',
    archetypeEn: 'Keeper',
    description:
      'Вы — человек отношений. Забота, поддержка, верность — это не слова, а ваш способ жить. Вы создаёте тепло вокруг себя и всегда готовы прийти на помощь. Ваша преданность — настоящая ценность.',
    descriptionEn:
      'You are a relationship person. Care, support, loyalty — these are not just words but your way of life. You create warmth around you and are always ready to help.',
    whenHigh:
      'Высокий балл указывает на выраженную потребность в одобрении и сложности с самостоятельным принятием решений. Вы достойны любви не за то, что делаете для других, а просто потому, что вы — это вы.',
    whenHighEn:
      'A high score indicates a pronounced need for approval and difficulty making independent decisions. You deserve love not for what you do for others, but simply because you are you.',
    color: '#D53F8C',
    cluster: 'C',
  },
  {
    code: 'OBC',
    label: 'Добросовестный',
    labelEn: 'Conscientious',
    clinical: 'Обсессивно-компульсивный',
    clinicalEn: 'Obsessive-Compulsive',
    archetype: 'Часовщик',
    archetypeEn: 'Watchmaker',
    description:
      'Вы — воплощение надёжности. Ваша дисциплина, внимание к деталям и высокие стандарты делают вас тем, на кого можно положиться в любой ситуации. Вы честны, последовательны и держите слово.',
    descriptionEn:
      'You are the embodiment of reliability. Your discipline, attention to detail, and high standards make you someone who can be counted on in any situation.',
    whenHigh:
      'Высокий балл говорит о выраженном перфекционизме и потребности в контроле. Помните: «достаточно хорошо» — это тоже хорошо. Гибкость делает вашу силу ещё мощнее.',
    whenHighEn:
      'A high score indicates pronounced perfectionism and need for control. Remember: "good enough" is also good. Flexibility makes your strength even more powerful.',
    color: '#718096',
    cluster: 'C',
  },
  // Настроение
  {
    code: 'BAR',
    label: 'Переменчивый',
    labelEn: 'Cyclothymic',
    clinical: 'Биполярный',
    clinicalEn: 'Bipolar',
    archetype: 'Маятник',
    archetypeEn: 'Pendulum',
    description:
      'Ваша эмоциональная жизнь характеризуется выраженной цикличностью: периоды высокой энергии, продуктивности и оптимизма сменяются периодами упадка и потери интереса. Эти волны не всегда привязаны к внешним событиям. Важно: это не тип личности, а особенность регуляции настроения, которая поддаётся коррекции.',
    descriptionEn:
      'Your emotional life is characterized by pronounced cyclicity: periods of high energy, productivity, and optimism alternate with periods of decline and loss of interest. These waves are not always tied to external events. Important: this is not a personality type but a mood regulation feature that responds to treatment.',
    whenHigh:
      'Высокий балл указывает на возможные эпизоды маниакальных и депрессивных состояний. Это может объяснять непостоянство продуктивности, импульсивные решения на подъёме и периоды полного истощения. Рекомендуется консультация специалиста.',
    whenHighEn:
      'A high score indicates possible manic and depressive episodes. This may explain inconsistent productivity, impulsive decisions during highs, and periods of exhaustion. A specialist consultation is recommended.',
    color: '#F6AD55',
    cluster: 'mood',
  },
  // Дополнительные
  {
    code: 'PAG',
    label: 'Упрямый',
    labelEn: 'Resistant',
    clinical: 'Пассивно-агрессивный',
    clinicalEn: 'Passive-Aggressive',
    archetype: 'Партизан',
    archetypeEn: 'Partisan',
    description:
      'Вы остро чувствуете несправедливость и давление извне, но предпочитаете сопротивляться не напрямую, а косвенно. Ваш стиль — тихий протест: вы не идёте на открытый конфликт, но и не подчиняетесь тому, что считаете неправильным. Вы наблюдательны и хорошо чувствуете расстановку сил.',
    descriptionEn:
      "You keenly sense injustice and external pressure but prefer to resist indirectly. Your style is quiet protest: you avoid open conflict but don't submit to what you consider wrong. You are observant and good at reading power dynamics.",
    whenHigh:
      'Высокий балл говорит о привычке выражать недовольство непрямыми способами: промедление, «забывчивость», сарказм, формальное согласие без реального выполнения. Попробуйте практиковать прямое выражение несогласия.',
    whenHighEn:
      'A high score indicates a habit of expressing dissatisfaction indirectly: procrastination, "forgetfulness," sarcasm, formal agreement without actual compliance. Try practicing direct expression of disagreement.',
    color: '#A0AEC0',
    cluster: 'additional',
  },
  {
    code: 'DPR',
    label: 'Задумчивый',
    labelEn: 'Reflective',
    clinical: 'Депрессивный',
    clinicalEn: 'Depressive',
    archetype: 'Философ',
    archetypeEn: 'Philosopher',
    description:
      'Ваш базовый эмоциональный фон — скорее серьёзный и задумчивый, чем лёгкий. Вы склонны к самокритике и видите мир без прикрас. Это не «плохое настроение», а устойчивая черта: вы просто устроены так, что глубина для вас важнее лёгкости.',
    descriptionEn:
      'Your baseline emotional tone is serious and contemplative rather than light. You tend toward self-criticism and see the world without embellishment. This is not a "bad mood" but a stable trait: depth matters more to you than lightness.',
    whenHigh:
      'Высокий балл указывает на хронический пессимизм, сниженную способность к радости и тенденцию к самообвинению. Психотерапия помогает скорректировать этот фильтр, не отнимая у вас глубину.',
    whenHighEn:
      'A high score indicates chronic pessimism, reduced capacity for joy, and tendency toward self-blame. Psychotherapy can adjust this filter without taking away your depth.',
    color: '#718096',
    cluster: 'additional',
  },
]

/** Все коды шкал (13 шт.) */
export const ALL_SCALE_CODES: PersonalityTypeCode[] = [
  'PAR',
  'SZD',
  'SZT',
  'ANT',
  'BOR',
  'HIS',
  'NAR',
  'AVD',
  'DEP',
  'OBC',
  'BAR',
  'PAG',
  'DPR',
]

/** 10 базовых шкал DSM-5 */
export const BASE_SCALE_CODES: PersonalityTypeCode[] = [
  'PAR',
  'SZD',
  'SZT',
  'ANT',
  'BOR',
  'HIS',
  'NAR',
  'AVD',
  'DEP',
  'OBC',
]

/** Получить тип по коду */
export function getPersonalityType(code: PersonalityTypeCode): PersonalityType {
  return PERSONALITY_TYPES.find((t) => t.code === code)!
}

/** Получить типы по кластеру */
export function getTypesByCluster(cluster: PersonalityCluster): PersonalityType[] {
  return PERSONALITY_TYPES.filter((t) => t.cluster === cluster)
}

/** Заменить коды типов (PAR, SZD, ...) на читаемые названия в тексте */
export function replaceTypeCodes(text: string, isRu: boolean, isAdmin?: boolean): string {
  return text.replace(/\b(PAR|SZD|SZT|ANT|BOR|HIS|NAR|AVD|DEP|OBC|BAR|PAG|DPR)\b/g, (code) => {
    const type = PERSONALITY_TYPES.find((t) => t.code === code)
    if (!type) {
      return code
    }
    const name = isRu ? `${type.label} ${type.archetype}` : `${type.labelEn} ${type.archetypeEn}`
    if (isAdmin) {
      const clinical = isRu ? type.clinical : type.clinicalEn
      return `${name} (${clinical.toLowerCase()})`
    }
    return name
  })
}

/**
 * Максимально возможные сырые баллы по каждой шкале (1955 вопросов).
 * Пересчитаны психологом 19.03.2026 (v2).
 */
export const GLOBAL_MAX_SCORES: Record<PersonalityTypeCode, number> = {
  PAR: 1529,
  SZD: 2893,
  SZT: 1772,
  ANT: 2096,
  BOR: 1466,
  HIS: 2147,
  NAR: 2102,
  AVD: 2585,
  DEP: 2787,
  OBC: 2950,
  BAR: 936,
  PAG: 486,
  DPR: 716,
}
