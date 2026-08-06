/** Код шкалы: 13 исходных (10 DSM-5 + 3 дополнительные) + 9 новых (этап 5.1, ядро 22) */
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
  | 'MAC'
  | 'HUM'
  | 'KAN'
  | 'FAI'
  | 'SAD'
  | 'MAS'
  | 'ASD'
  | 'DIR'
  | 'ALX'

/**
 * Код экспериментальной шкалы (этап 5.5): авторские/прототипные конструкты ВНЕ ядра 22.
 * В express и тизер не входят, в топ-черт и ipsative-ранжирование не участвуют,
 * отображаются ТОЛЬКО в кабинете психолога с обязательной пометкой «бета».
 */
export type ExperimentalScaleCode = 'RES_PHYS' | 'RES_AFF' | 'SPEC_INT'

/** Любой скоримый код шкалы: ядро 22 + экспериментальные */
export type ScaleCode = PersonalityTypeCode | ExperimentalScaleCode

/** Кластер/группа шкалы */
export type PersonalityCluster =
  | 'A'
  | 'B'
  | 'C'
  | 'mood'
  | 'additional'
  /** Тёмная триада (MAC + NAR + ANT-as-PSY) */
  | 'dark'
  /** Светлая триада (HUM, KAN, FAI) */
  | 'light'
  /** Деструктивные паттерны (SAD, MAS) */
  | 'destructive'
  /** Спектр развития (ASD, DIR, ALX) */
  | 'spectrum'

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
  /** Кластер: A (эксцентричные), B (драматичные), C (тревожные), mood (настроение), additional (дополнительные), dark/light (триады), destructive, spectrum */
  cluster: PersonalityCluster
  /** Экспериментальный авторский конструкт — в UI всегда помечается «бета» */
  beta?: boolean
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
  // Тёмная триада (NAR и ANT переиспользуются из DSM-5 шкал, см. DARK_TRIAD_CODES)
  {
    code: 'MAC',
    label: 'Стратегичный',
    labelEn: 'Strategic',
    clinical: 'Макиавеллизм',
    clinicalEn: 'Machiavellianism',
    archetype: 'Гроссмейстер',
    archetypeEn: 'Grandmaster',
    description:
      'Вы видите социальные ситуации как систему: кто чего хочет, где рычаги, какой ход даст результат. Вы просчитываете на несколько шагов вперёд и редко действуете импульсивно. Прагматизм и хладнокровие делают вас сильным переговорщиком и организатором — вы добиваетесь целей там, где другие сдаются.',
    descriptionEn:
      'You see social situations as a system: who wants what, where the levers are, which move yields results. You think several steps ahead and rarely act on impulse. Pragmatism and composure make you a strong negotiator and organizer — you achieve goals where others give up.',
    whenHigh:
      'Высокий балл говорит о склонности относиться к людям инструментально и добиваться своего скрытыми ходами. Расчёт — ваша сила, но доверие строится только открытостью. Точка роста: переводить стратегию в честные переговоры, где выигрывают обе стороны.',
    whenHighEn:
      'A high score suggests a tendency to treat people instrumentally and achieve goals through hidden moves. Calculation is your strength, but trust is built only through openness. Growth point: turning strategy into honest win-win negotiations.',
    color: '#6B46C1',
    cluster: 'dark',
  },
  // Светлая триада
  {
    code: 'HUM',
    label: 'Человечный',
    labelEn: 'Humane',
    clinical: 'Гуманизм',
    clinicalEn: 'Humanism',
    archetype: 'Целитель',
    archetypeEn: 'Healer',
    description:
      'Вы цените достоинство каждого человека — не за заслуги, а по умолчанию. Чужая боль для вас не абстракция: вы замечаете её и не можете пройти мимо. Люди рядом с вами чувствуют себя увиденными и значимыми — это редкий дар, который лечит.',
    descriptionEn:
      'You value every person’s dignity — not for their merits, but by default. Others’ pain is not an abstraction to you: you notice it and cannot walk past. People around you feel seen and valued — a rare gift that heals.',
    whenHigh:
      'Высокий балл — большой ресурс, но у него есть ловушка: самозабвение. Помогая всем, легко забыть себя и выгореть. Точка роста: границы. Забота о себе — не эгоизм, а условие, при котором вашего тепла хватит надолго.',
    whenHighEn:
      'A high score is a great resource, but it has a trap: self-neglect. Helping everyone, it is easy to forget yourself and burn out. Growth point: boundaries. Self-care is not selfishness but the condition that makes your warmth last.',
    color: '#48BB78',
    cluster: 'light',
  },
  {
    code: 'KAN',
    label: 'Принципиальный',
    labelEn: 'Principled',
    clinical: 'Кантианство',
    clinicalEn: 'Kantianism',
    archetype: 'Законодатель',
    archetypeEn: 'Lawgiver',
    description:
      'Для вас человек — всегда цель, а не средство. Вы держите слово, даже когда это невыгодно, и не согласны покупать результат ценой принципов. На вас можно положиться в главном: вы не предадите — не потому что боитесь, а потому что так устроены.',
    descriptionEn:
      'For you, a person is always an end, never a means. You keep your word even when it costs you, and refuse to buy results at the price of principles. You can be relied on in what matters: you won’t betray — not out of fear, but because that is how you are built.',
    whenHigh:
      'Высокий балл может оборачиваться ригидностью: принципы превращаются в приговоры, а требования к себе и другим — в морализаторство. Точка роста: помнить, что за каждым поступком стоит контекст, и правило существует ради человека, а не наоборот.',
    whenHighEn:
      'A high score can turn into rigidity: principles become verdicts, and standards become moralizing. Growth point: remembering that every act has a context, and rules exist for people — not the other way around.',
    color: '#4299E1',
    cluster: 'light',
  },
  {
    code: 'FAI',
    label: 'Доверяющий',
    labelEn: 'Trusting',
    clinical: 'Вера в человечество',
    clinicalEn: 'Faith in Humanity',
    archetype: 'Маяк',
    archetypeEn: 'Lighthouse',
    description:
      'Вы исходите из того, что люди в основе своей хороши. Это не наивность, а позиция: доверие авансом раскрывает в людях лучшее, и рядом с вами они действительно становятся лучше. Вы умеете видеть свет там, где другие видят только риски.',
    descriptionEn:
      'You assume people are fundamentally good. This is not naivety but a stance: trust given in advance brings out the best in people, and around you they truly become better. You see light where others see only risks.',
    whenHigh:
      'Высокий балл делает вас уязвимым для тех, кто использует доверие как ресурс. Точка роста: «доверяй и проверяй» — доверие как выбор, а не как слепота. Ваш аванс доверия ценнее, когда у него есть границы.',
    whenHighEn:
      'A high score makes you vulnerable to those who exploit trust. Growth point: “trust but verify” — trust as a choice, not blindness. Your advance of trust is worth more when it has limits.',
    color: '#ECC94B',
    cluster: 'light',
  },
  // Деструктивные паттерны
  {
    code: 'SAD',
    label: 'Жёсткий',
    labelEn: 'Hard-Edged',
    clinical: 'Бытовой садизм',
    clinicalEn: 'Everyday Sadism',
    archetype: 'Гладиатор',
    archetypeEn: 'Gladiator',
    description:
      'Вас заводит борьба: жёсткая конкуренция, острые дебаты, игры на выбывание. Там, где другие отводят глаза, вы смотрите не моргая. Чёрный юмор, устойчивость к чужому дискомфорту и азарт схватки делают вас грозным соперником и человеком, который не падает в обморок от жёсткой реальности.',
    descriptionEn:
      'You are energized by contest: fierce competition, sharp debates, elimination games. Where others look away, you watch without blinking. Dark humor, tolerance for others’ discomfort, and the thrill of the fight make you a formidable opponent who does not faint at harsh reality.',
    whenHigh:
      'Высокий балл — сигнал: если чужой проигрыш радует сам по себе, без выгоды для вас, стоит присмотреться. Точка роста: направлять азарт в рамки с правилами — спорт, дебаты, стратегии — и тренировать эмпатию как навык, а не ждать её как чувство.',
    whenHighEn:
      'A high score is a signal: if another’s loss pleases you in itself, with no gain for you, it deserves attention. Growth point: channeling the thrill into rule-bound arenas — sports, debate, strategy — and training empathy as a skill rather than waiting for it as a feeling.',
    color: '#C53030',
    cluster: 'destructive',
  },
  {
    code: 'MAS',
    label: 'Самоотверженный',
    labelEn: 'Self-Sacrificing',
    clinical: 'Мазохизм (авторский конструкт)',
    clinicalEn: 'Masochism (author’s construct)',
    archetype: 'Мученик',
    archetypeEn: 'Martyr',
    description:
      'Вы умеете терпеть то, от чего другие бегут: боль, лишения, неблагодарный труд. Выносливость и готовность жертвовать собой ради дела или людей — ваша суперсила. Вы выбираете трудный путь не из слабости, а потому что верите: настоящее даётся дорого.',
    descriptionEn:
      'You can endure what others flee: pain, hardship, thankless work. Endurance and readiness to sacrifice yourself for a cause or for people is your superpower. You choose the hard path not out of weakness, but because you believe what is real comes at a price.',
    whenHigh:
      'Высокий балл может означать, что страдание стало привычным способом чувствовать себя настоящим или заслуживать любовь. Если вы систематически выбираете то, что причиняет боль, — это паттерн, а не судьба. Точка роста: самосострадание и вопрос «а как было бы легко?».',
    whenHighEn:
      'A high score may mean suffering has become your habitual way to feel real or to earn love. If you systematically choose what hurts, it is a pattern, not fate. Growth point: self-compassion and the question “what would the easy way look like?”.',
    color: '#975A16',
    cluster: 'destructive',
    beta: true,
  },
  // Спектр развития
  {
    code: 'ASD',
    label: 'Систематизирующий',
    labelEn: 'Systematizing',
    clinical: 'Черты аутистического спектра',
    clinicalEn: 'Autism Spectrum Traits',
    archetype: 'Инженер',
    archetypeEn: 'Engineer',
    description:
      'Вы мыслите системами: замечаете паттерны, структуры и несостыковки, которые ускользают от других. Погружение в интересную тему для вас — не хобби, а стихия: вы способны знать о ней всё. Точность формулировок, честность деталей и глубина фокуса делают вас незаменимым там, где нужна настоящая экспертиза.',
    descriptionEn:
      'You think in systems: noticing patterns, structures, and inconsistencies others miss. Deep-diving into an interesting topic is not a hobby for you but your element — you can know everything about it. Precision, honesty of detail, and depth of focus make you indispensable where real expertise is needed.',
    whenHigh:
      'Высокий балл часто означает, что социальная неопределённость и сенсорный шум утомляют вас сильнее, чем других. Это не дефект, а особенность обработки информации. Точка роста: среда под себя — предсказуемость, прямые договорённости, время на восстановление после «людных» дней.',
    whenHighEn:
      'A high score often means social ambiguity and sensory noise drain you more than others. This is not a defect but a processing style. Growth point: an environment tailored to you — predictability, explicit agreements, recovery time after people-heavy days.',
    color: '#00B5D8',
    cluster: 'spectrum',
  },
  {
    code: 'DIR',
    label: 'Прямой',
    labelEn: 'Direct',
    clinical: 'Радикальная честность',
    clinicalEn: 'Radical Honesty',
    archetype: 'Зеркало',
    archetypeEn: 'Mirror',
    description:
      'Правда для вас важнее социальной гладкости. Вы говорите то, что думаете, не играете ролей и мгновенно чувствуете фальшь — в других и в себе. С вами может быть непросто, но вам можно верить: ваше «да» — это да, ваше «нет» — это нет. В мире полутонов вы — точка опоры.',
    descriptionEn:
      'Truth matters more to you than social smoothness. You say what you think, play no roles, and instantly sense fakeness — in others and in yourself. You may not be easy, but you can be trusted: your “yes” means yes, your “no” means no. In a world of half-tones, you are a fixed point.',
    whenHigh:
      'Высокий балл означает, что прямота без запроса может ранить: не всякая правда — подарок, если её не просили. Точка роста: правда плюс такт. Честность становится сильнее, когда учитывает готовность собеседника её услышать.',
    whenHighEn:
      'A high score means unrequested directness can wound: not every truth is a gift if no one asked for it. Growth point: truth plus tact. Honesty grows stronger when it accounts for the listener’s readiness to hear it.',
    color: '#2C7A7B',
    cluster: 'spectrum',
  },
  {
    code: 'ALX',
    label: 'Сдержанный',
    labelEn: 'Reserved',
    clinical: 'Алекситимия',
    clinicalEn: 'Alexithymia',
    archetype: 'Переводчик',
    archetypeEn: 'Translator',
    description:
      'Вы опираетесь на факты и действия там, где другие говорят о чувствах. В кризисе, когда у всех паника, вы сохраняете ясную голову и делаете то, что нужно. Ваши эмоции не отсутствуют — они просто говорят на другом языке: языке тела, усталости, напряжения.',
    descriptionEn:
      'You rely on facts and actions where others talk about feelings. In a crisis, when everyone panics, you keep a clear head and do what is needed. Your emotions are not absent — they simply speak another language: the language of the body, fatigue, and tension.',
    whenHigh:
      'Высокий балл говорит о том, что распознавать и называть собственные чувства вам ощутимо труднее, чем большинству. Иногда это следствие опыта, где чувства обесценивались. Точка роста: словарь эмоций — замечать телесные сигналы и учиться давать им имена. Это навык, и он тренируется.',
    whenHighEn:
      'A high score means recognizing and naming your own feelings is noticeably harder for you than for most. Sometimes this stems from experiences where feelings were invalidated. Growth point: an emotion vocabulary — noticing bodily signals and learning to name them. It is a skill, and it can be trained.',
    color: '#B794F4',
    cluster: 'spectrum',
  },
]

/** Все коды шкал ядра (22 шт. = 13 исходных + 9 новых) */
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
  'MAC',
  'HUM',
  'KAN',
  'FAI',
  'SAD',
  'MAS',
  'ASD',
  'DIR',
  'ALX',
]

/**
 * Шкалы-состояния (этап 5.6.1): эпизодические аффективные состояния, НЕ устойчивые черты.
 * BAR — циклы настроения (дни–недели), DPR-скрининг — депрессивный фон. В UI выносятся
 * в отдельный блок «Состояния» (черты стабильны, состояния приходят и уходят —
 * это ещё и дестигматизирующий нарратив). В топ-3 черт НЕ участвуют.
 */
export const STATE_CODES: PersonalityTypeCode[] = ['BAR', 'DPR']

/** Новые шкалы этапа 5.1 (9 шт.) */
export const EXTENDED_SCALE_CODES: PersonalityTypeCode[] = [
  'MAC',
  'HUM',
  'KAN',
  'FAI',
  'SAD',
  'MAS',
  'ASD',
  'DIR',
  'ALX',
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

/**
 * Светлая триада (Kaufman et al., 2019): Гуманизм, Кантианство, Вера в человечество.
 * НЕ противоположность Тёмной: корреляция триад умеренно отрицательная (r ≈ −.48),
 * высокие баллы по обеим — норма данных, не парадокс.
 */
export const LIGHT_TRIAD_CODES: PersonalityTypeCode[] = ['HUM', 'KAN', 'FAI']

/**
 * Тёмная триада: Макиавеллизм + переиспользованные DSM-5 шкалы.
 * NAR и ANT НЕ дублируются отдельными шкалами (решение 2026-07-03):
 * в контексте триады они отображаются под ярлыками «Нарциссизм» и «Психопатия»
 * (PSY — display-alias шкалы ANT, см. DARK_TRIAD_DISPLAY).
 */
export const DARK_TRIAD_CODES: PersonalityTypeCode[] = ['MAC', 'NAR', 'ANT']

/** Ярлыки шкал в контексте Тёмной триады (display-alias, баллы не меняются) */
export const DARK_TRIAD_DISPLAY: Partial<Record<PersonalityTypeCode, { ru: string; en: string }>> = {
  MAC: { ru: 'Макиавеллизм', en: 'Machiavellianism' },
  NAR: { ru: 'Нарциссизм', en: 'Narcissism' },
  ANT: { ru: 'Психопатия', en: 'Psychopathy' },
}

/**
 * 8 шкал гексаграммы (этапы 5.2/5.3): обе триады + внешнее кольцо SAD/MAS.
 * Ровно эти шкалы покрывает экспресс-тест (24 вопроса = 8 × 3).
 */
export const HEXAGRAM_SCALE_CODES: PersonalityTypeCode[] = [...LIGHT_TRIAD_CODES, ...DARK_TRIAD_CODES, 'SAD', 'MAS']

/**
 * Оставшиеся 12 шкал ядра вне гексаграммы и вне «Состояний» (этап 5.7): тизер
 * под гексаграммой в результатах экспресса — заблокированный список, который
 * раскрывает полный тест. BAR/DPR (STATE_CODES) исключены — упомянуты отдельно.
 */
export const TEASER_SCALE_CODES: PersonalityTypeCode[] = ALL_SCALE_CODES.filter(
  (code) => !HEXAGRAM_SCALE_CODES.includes(code) && !STATE_CODES.includes(code),
)

/**
 * Экспериментальная шкала (этап 5.5): вне ядра 22 — отдельный интерфейс, а не запись
 * PERSONALITY_TYPES, чтобы ядро (тизер, express, ipsative, топ-черт, полнота
 * growth-practices/positive-profiles) структурно не могло затянуть эти коды.
 * Вопросы экспериментальных шкал скорят ТОЛЬКО экспериментальные коды — actual_max
 * ядра не меняется, поэтому их добавление НЕ инкрементирует QUESTION_BANK_VERSION.
 */
export interface ExperimentalScale {
  code: ExperimentalScaleCode
  /** Мягкое название */
  label: string
  labelEn: string
  /** Конструктное название (для кабинета психолога) */
  clinical: string
  clinicalEn: string
  /** Архетип */
  archetype: string
  archetypeEn: string
  /** Описание */
  description: string
  descriptionEn: string
  /** Описание при высоком балле */
  whenHigh: string
  whenHighEn: string
  /** Цвет для графика */
  color: string
  /** Прототип конструкта — честная маркировка происхождения (5.6.2) */
  prototype: string
  prototypeEn: string
}

/** Экспериментальные шкалы (этап 5.5) — всегда «бета», только кабинет психолога */
export const EXPERIMENTAL_SCALES: ExperimentalScale[] = [
  {
    code: 'RES_PHYS',
    label: 'Выносливый',
    labelEn: 'Enduring',
    clinical: 'Физическая броня (авторский конструкт)',
    clinicalEn: 'Physical Armor (author’s construct)',
    archetype: 'Крепость',
    archetypeEn: 'Fortress',
    description:
      'Тело выдерживает многое и не жалуется: усталость, дискомфорт, недосып, боль переносятся без драмы. В марафонских нагрузках и кризисах это делает вас опорой — вы продолжаете действовать там, где другие уже сошли с дистанции.',
    descriptionEn:
      'The body endures a lot without complaint: fatigue, discomfort, sleep loss, and pain are carried without drama. In marathon workloads and crises this makes you an anchor — you keep acting where others have already dropped out.',
    whenHigh:
      'Высокий балл означает, что телесные сигналы приглушены: усталость, боль и болезнь замечаются поздно, когда ресурс уже на нуле. Броня защищает, но она же скрывает износ. Точка роста: регулярные «техосмотры» — сон, чек-апы, телесные практики — не дожидаясь, пока тело перейдёт на крик.',
    whenHighEn:
      'A high score means bodily signals are muted: fatigue, pain, and illness get noticed late, when reserves are already empty. Armor protects — and hides wear. Growth point: regular “maintenance checks” — sleep, check-ups, body practices — without waiting for the body to start screaming.',
    color: '#9C4221',
    prototype: 'Авторский конструкт (валидированного прототипа нет)',
    prototypeEn: 'Author’s construct (no validated prototype)',
  },
  {
    code: 'RES_AFF',
    label: 'Резонирующий',
    labelEn: 'Resonant',
    clinical: 'Аффективный резонанс',
    clinicalEn: 'Affective Resonance',
    archetype: 'Камертон',
    archetypeEn: 'Tuning Fork',
    description:
      'Чужие состояния и атмосфера помещения отзываются в вас почти телесно: напряжение в комнате вы ловите раньше, чем прозвучат слова. Этот радар делает вас тонким собеседником — люди чувствуют, что их состояние замечено без объяснений.',
    descriptionEn:
      'Other people’s states and the room’s atmosphere resonate in you almost physically: you catch tension before a word is spoken. This radar makes you a finely tuned interlocutor — people feel their state is noticed without explanation.',
    whenHigh:
      'Высокий балл означает, что чужое переживается как своё — вплоть до личного дистресса: после тяжёлых разговоров вы разряжены, а от чужой боли хочется не помочь, а сбежать. Точка роста: различать «моё/чужое», дозировать эмоционально насыщенные контексты и планировать восстановление как рабочую задачу.',
    whenHighEn:
      'A high score means others’ experiences are lived as your own — up to personal distress: heavy conversations drain you, and others’ pain can trigger flight rather than help. Growth point: telling “mine” from “theirs”, dosing emotionally loaded contexts, and scheduling recovery as a real task.',
    color: '#00A3C4',
    prototype: 'IRI Personal Distress (Davis, 1980) / HSP Scale (Aron & Aron, 1997) — на уровне конструкта',
    prototypeEn: 'IRI Personal Distress (Davis, 1980) / HSP Scale (Aron & Aron, 1997) — construct level',
  },
  {
    code: 'SPEC_INT',
    label: 'Погружённый',
    labelEn: 'Immersed',
    clinical: 'Специальные интересы (авторский конструкт)',
    clinicalEn: 'Special Interests (author’s construct)',
    archetype: 'Хранитель огня',
    archetypeEn: 'Keeper of the Flame',
    description:
      'Интерес захватывает вас целиком: в своей теме вы знаете «всё» и способны говорить о ней часами, теряя счёт времени. Такая глубина погружения — редкий когнитивный ресурс: там, где нужен настоящий эксперт, вы незаменимы.',
    descriptionEn:
      'An interest absorbs you completely: within your topic you know “everything” and can talk about it for hours, losing track of time. This depth of immersion is a rare cognitive resource: where a true expert is needed, you are irreplaceable.',
    whenHigh:
      'Высокий балл означает, что интерес может вытеснять остальные сферы: сон, быт, отношения подстраиваются под тему. Сам интерес — не проблема, проблема — монополия. Точка роста: договорённости с близкими о «времени темы» и мостики от интереса к людям — делиться, преподавать, находить сообщество.',
    whenHighEn:
      'A high score means the interest can crowd out other spheres: sleep, daily life, and relationships bend around the topic. The interest itself is not the problem — its monopoly is. Growth point: agreements with loved ones about “topic time” and bridges from the interest to people — sharing, teaching, finding a community.',
    color: '#B83280',
    prototype: 'Авторский конструкт; ориентир — клинические описания specific/circumscribed interests',
    prototypeEn: 'Author’s construct; informed by clinical descriptions of specific/circumscribed interests',
  },
]

/** Коды экспериментальных шкал (этап 5.5) */
export const EXPERIMENTAL_SCALE_CODES: ExperimentalScaleCode[] = ['RES_PHYS', 'RES_AFF', 'SPEC_INT']

/**
 * Все скоримые шкалы: ядро 22 + экспериментальные. По этому списку идут скоринг
 * (raw/normalized/confidence/relevantCounts) и стратификация выборки вопросов.
 * Интерпретация (топ-черт, ipsative, тизер, express, ачивки) — только по ALL_SCALE_CODES.
 */
export const SCORED_SCALE_CODES: ScaleCode[] = [...ALL_SCALE_CODES, ...EXPERIMENTAL_SCALE_CODES]

/** Получить экспериментальную шкалу по коду */
export function getExperimentalScale(code: ExperimentalScaleCode): ExperimentalScale {
  return EXPERIMENTAL_SCALES.find((s) => s.code === code)!
}

/** Получить тип по коду */
export function getPersonalityType(code: PersonalityTypeCode): PersonalityType {
  return PERSONALITY_TYPES.find((t) => t.code === code)!
}

/** Получить типы по кластеру */
export function getTypesByCluster(cluster: PersonalityCluster): PersonalityType[] {
  return PERSONALITY_TYPES.filter((t) => t.cluster === cluster)
}

/**
 * Кому адресована подпись шкалы.
 *
 * - `user` — юзерская лексика: «label + архетип», никакой клиники (политика 5.6.1).
 * - `construct` — конструктное название (поле `clinical`), но **только для шкал
 *   из белого списка** `PUBLIC_CONSTRUCT_SCALES`; для остальных молча падает
 *   обратно на юзерское имя. Нужен там, где пользователю осознанно показывают
 *   термины — гексаграмма Светлой и Тёмной триад без них теряет смысл.
 * - `clinician` — конструктное/клиническое название без ограничений. Только
 *   кабинет психолога.
 */
export type ScaleNameAudience = 'user' | 'construct' | 'clinician'

/**
 * Шкалы, чьё поле `clinical` продуктово одобрено к показу пользователю.
 *
 * Это ровно 8 шкал гексаграммы: их конструктные имена («Гуманизм», «Психопатия»,
 * «Бытовой садизм») — узнаваемые термины триад, а не диагнозы из карточки.
 *
 * Смысл списка — сделать политику 5.6.1 механической, а не договорной. Раньше
 * четыре компонента выбирали `clinical` или `label` на месте вызова, и новый
 * компонент мог взять клиническое название для пользователя, ничего не нарушив
 * формально. Теперь шкала вне списка не отдаст `clinical` в пользовательский
 * контекст, даже если автор попросит.
 */
export const PUBLIC_CONSTRUCT_SCALES: PersonalityTypeCode[] = HEXAGRAM_SCALE_CODES

/**
 * Единая точка именования шкалы: аудитория + нужен ли триада-алиас.
 *
 * Заменяет четыре локальные функции (`scaleName` в express-results и
 * dark-core-block, `scaleLabel` в hexagram-chart, `teaserName` в scale-teaser),
 * которые решали одну задачу по-разному.
 */
export function getScaleName(
  code: PersonalityTypeCode,
  options: { audience: ScaleNameAudience; triadAlias?: boolean },
  isRu: boolean,
): string {
  if (options.triadAlias) {
    const display = DARK_TRIAD_DISPLAY[code]
    if (display) {
      return isRu ? display.ru : display.en
    }
  }

  const type = getPersonalityType(code)
  if (!type) {
    return code
  }

  const userName = isRu ? `${type.label} ${type.archetype}` : `${type.labelEn} ${type.archetypeEn}`
  if (options.audience === 'user') {
    return userName
  }
  if (options.audience === 'construct' && !PUBLIC_CONSTRUCT_SCALES.includes(code)) {
    return userName
  }
  return (isRu ? type.clinical : type.clinicalEn) || userName
}

/** Regex всех кодов шкал (генерируется из ALL_SCALE_CODES — не забыть про новые шкалы невозможно) */
const SCALE_CODES_RE = new RegExp(`\\b(${ALL_SCALE_CODES.join('|')})\\b`, 'g')

/** Заменить коды типов (PAR, SZD, ...) на читаемые названия в тексте */
export function replaceTypeCodes(text: string, isRu: boolean, isAdmin?: boolean): string {
  return text.replace(SCALE_CODES_RE, (code) => {
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
 * Максимально возможные сырые баллы по каждой шкале (2090 вопросов).
 * База: v2 психолога 19.03.2026 (1955 вопросов) + дельта 135 вопросов этапа 5.1
 * (пересчитано merge-question-batch.ts, 2026-07-04).
 */
export const GLOBAL_MAX_SCORES: Record<PersonalityTypeCode, number> = {
  PAR: 1585,
  SZD: 2937,
  SZT: 1789,
  ANT: 2140,
  BOR: 1474,
  HIS: 2198,
  NAR: 2133,
  AVD: 2683,
  DEP: 2828,
  OBC: 3047,
  BAR: 936,
  PAG: 513,
  DPR: 729,
  MAC: 120,
  HUM: 135,
  KAN: 108,
  FAI: 74,
  SAD: 47,
  MAS: 51,
  ASD: 51,
  DIR: 101,
  ALX: 56,
}
