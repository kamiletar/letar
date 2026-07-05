import type { PersonalityTypeCode } from './personality-types'

/**
 * Доказательная модальность, на которую опирается практика.
 * Определяет бейдж в UI (этап 5.6.1).
 *
 * - `cbt`    — когнитивно-поведенческая терапия (когнит. реструктуризация, экспозиция, поведенческие эксперименты)
 * - `dbt`    — диалектическая поведенческая терапия (навыки эмоц. регуляции, дистресс-толерантность)
 * - `schema` — схема-терапия (работа с ранними схемами и режимами, язык терапевта)
 * - `general`— общеразвивающая практика без привязки к конкретной школе
 */
export type PracticeMethod = 'cbt' | 'dbt' | 'schema' | 'general'

/** Метки методов для бейджей UI */
export const PRACTICE_METHOD_LABELS: Record<PracticeMethod, { ru: string; en: string }> = {
  cbt: { ru: 'КПТ', en: 'CBT' },
  dbt: { ru: 'DBT-навык', en: 'DBT skill' },
  schema: { ru: 'Схема-терапия', en: 'Schema therapy' },
  general: { ru: 'Практика', en: 'Practice' },
}

/** Одна конкретная практика (действие) для развития/нивелирования черты */
export interface GrowthPractice {
  /** Конкретное действие (русский) */
  text: string
  /** Конкретное действие (английский) */
  textEn: string
  /** Доказательная модальность-опора */
  method: PracticeMethod
}

/** Набор практик для одной шкалы */
export interface GrowthProfile {
  code: PersonalityTypeCode
  practices: GrowthPractice[]
}

/**
 * Практики для всех 22 шкал ядра — блок «Практики» developmental-фрейма (этап 5.6.1).
 * Опора на доказательные техники (схема-терапия, DBT, КПТ); формулировки — авторские,
 * без заимствования пунктов валидированных опросников (принцип лицензионной чистоты 5.6.2).
 * Каждая практика — конкретное действие, а не абстрактный совет.
 */
export const GROWTH_PROFILES: GrowthProfile[] = [
  // ===== Кластер A =====
  {
    code: 'PAR',
    practices: [
      {
        text: 'Когда ловите себя на тревожной интерпретации чужого поступка, выпишите её и рядом — 2–3 других объяснения того же факта. Спросите: какие доказательства есть за каждое? Так вы отличаете реальный сигнал от тени.',
        textEn:
          'When you catch an anxious interpretation of someone’s action, write it down and next to it list 2–3 alternative explanations of the same fact. Ask: what evidence supports each? This separates a real signal from a shadow.',
        method: 'cbt',
      },
      {
        text: 'Раз в неделю проводите маленький «эксперимент на доверие»: сделайте один шаг навстречу человеку из ближнего круга, не выжидая подвоха, и отметьте, что произошло на самом деле. Реальность обычно мягче прогноза.',
        textEn:
          'Once a week run a small “trust experiment”: take one step toward someone in your inner circle without bracing for a trap, and note what actually happened. Reality is usually gentler than the forecast.',
        method: 'cbt',
      },
    ],
  },
  {
    code: 'SZD',
    practices: [
      {
        text: 'Дозируйте социальность как ресурс, а не как обязанность: запланируйте один короткий, заранее ограниченный по времени контакт в неделю (30–40 минут). Предсказуемые рамки снимают напряжение от «неизвестно, сколько это продлится».',
        textEn:
          'Dose social contact as a resource, not a duty: schedule one short, time-boxed interaction per week (30–40 min). Predictable limits remove the strain of “I don’t know how long this will last”.',
        method: 'general',
      },
      {
        text: 'Замечайте моменты, когда за автономией прячется старое правило «близость небезопасна». Назовите это правило вслух — уже само называние ослабляет его власть над выбором.',
        textEn:
          'Notice moments when autonomy hides an old rule “closeness is unsafe”. Name that rule out loud — naming it already loosens its grip on your choices.',
        method: 'schema',
      },
    ],
  },
  {
    code: 'SZT',
    practices: [
      {
        text: 'Заведите привычку «догадка → проверка»: перед тем как поверить яркой интуитивной связи, ищите один факт, который её опровергнет. Интуиция ценнее, когда проходит проверку реальностью, а не заменяет её.',
        textEn:
          'Build a “hunch → check” habit: before believing a vivid intuitive connection, look for one fact that would disprove it. Intuition is worth more when it passes a reality check rather than replacing one.',
        method: 'cbt',
      },
      {
        text: 'Когда поток образов и смыслов перегружает, используйте заземление 5-4-3-2-1: назовите 5 вещей, которые видите, 4 — которые слышите, и так далее. Это возвращает в «здесь и сейчас» без потери вашей нестандартности.',
        textEn:
          'When the flood of images and meanings overwhelms, use 5-4-3-2-1 grounding: name 5 things you see, 4 you hear, and so on. It returns you to the here-and-now without dulling your originality.',
        method: 'dbt',
      },
    ],
  },
  // ===== Кластер B =====
  {
    code: 'ANT',
    practices: [
      {
        text: 'Перед импульсивным решением вставьте паузу «СТОП»: остановитесь, сделайте шаг назад, оцените, что поставлено на карту, действуйте осознанно. Ваша решительность выигрывает, когда за ней стоит секунда выбора.',
        textEn:
          'Before an impulsive decision, insert a “STOP” pause: Stop, step back, Observe what’s at stake, Proceed mindfully. Your decisiveness wins when a second of choice stands behind it.',
        method: 'dbt',
      },
      {
        text: 'В решениях, задевающих других, добавьте один вопрос: «кто заплатит за это и согласен ли он?». Учёт цены для окружающих превращает бесстрашие из риска в лидерство.',
        textEn:
          'In decisions that affect others, add one question: “who pays for this, and did they agree?”. Weighing the cost to others turns fearlessness from a risk into leadership.',
        method: 'cbt',
      },
    ],
  },
  {
    code: 'BOR',
    practices: [
      {
        text: 'На пике сильной эмоции примените TIPP: холодная вода на лицо, интенсивная нагрузка на 5 минут, замедленное дыхание. Это физиологически сбивает накал за минуты и возвращает способность выбирать.',
        textEn:
          'At the peak of a strong emotion use TIPP: cold water on the face, 5 minutes of intense exercise, slow paced breathing. It physiologically lowers the intensity within minutes and restores your ability to choose.',
        method: 'dbt',
      },
      {
        text: 'Когда порыв тянет сделать резкое, попробуйте «противоположное действие»: если хочется хлопнуть дверью — мягко проговорите, если хочется исчезнуть — останьтесь на пять минут. Действие против волны учит её не бояться.',
        textEn:
          'When an urge pulls you toward something harsh, try “opposite action”: if you want to slam the door, speak softly instead; if you want to vanish, stay five more minutes. Acting against the wave teaches you not to fear it.',
        method: 'dbt',
      },
      {
        text: 'Ведите короткий дневник эмоций: ситуация → чувство → его сила 0–100 → что помогло. Через пару недель проявляются ваши триггеры и работающие опоры — карта, по которой шторм становится управляемым.',
        textEn:
          'Keep a brief emotion log: situation → feeling → intensity 0–100 → what helped. Within a couple of weeks your triggers and effective anchors emerge — a map that makes the storm navigable.',
        method: 'dbt',
      },
    ],
  },
  {
    code: 'HIS',
    practices: [
      {
        text: 'Раз в день делайте что-то ценное без свидетелей и без публикации. Опыт «я значим, даже когда никто не смотрит» строит внутреннюю опору, независимую от отклика зала.',
        textEn:
          'Once a day do something meaningful with no audience and no posting about it. The experience “I matter even when no one is watching” builds an inner anchor independent of the room’s response.',
        method: 'cbt',
      },
      {
        text: 'В разговоре тренируйте паузу-слушание: задайте вопрос и удержитесь от того, чтобы перевести фокус на себя, пока собеседник не договорит. Ваша харизма усиливается, когда светит и на других.',
        textEn:
          'In conversation practice listening pauses: ask a question and resist turning the focus back to yourself until the other person finishes. Your charisma grows when it also shines on others.',
        method: 'general',
      },
    ],
  },
  {
    code: 'NAR',
    practices: [
      {
        text: 'Тренируйте эмпатию как навык, а не ждите как чувство: в спорной ситуации сформулируйте позицию оппонента так, чтобы он сказал «да, именно это я и имел в виду». Перспектива другого — точка роста вашей уверенности.',
        textEn:
          'Train empathy as a skill rather than waiting for it as a feeling: in a disagreement, state your opponent’s position so well that they say “yes, that’s exactly what I meant”. The other’s perspective is where your confidence grows.',
        method: 'schema',
      },
      {
        text: 'Раз в неделю признавайте вслух один свой промах без «но». Способность выдержать несовершенство без обрушения самооценки — признак не слабой, а зрелой уверенности.',
        textEn:
          'Once a week acknowledge one of your mistakes out loud, with no “but”. Being able to tolerate imperfection without your self-worth collapsing is a sign of mature, not fragile, confidence.',
        method: 'schema',
      },
    ],
  },
  // ===== Кластер C =====
  {
    code: 'AVD',
    practices: [
      {
        text: 'Составьте лестницу из социальных ситуаций от лёгкой к трудной и поднимайтесь по одной ступени в неделю, оставаясь в ситуации, пока тревога не спадёт сама. Постепенная экспозиция расширяет зону комфорта без насилия над собой.',
        textEn:
          'Build a ladder of social situations from easy to hard and climb one rung a week, staying in each until the anxiety drops on its own. Gradual exposure widens your comfort zone without forcing yourself.',
        method: 'cbt',
      },
      {
        text: 'Когда предсказываете отвержение, проверьте прогноз фактом: сделайте шаг и запишите, что произошло на самом деле. Со временем накопится доказательство, что мир критичен к вам меньше, чем кажется.',
        textEn:
          'When you predict rejection, test the forecast against fact: take the step and record what actually happened. Over time you accumulate evidence that the world is less critical of you than it feels.',
        method: 'cbt',
      },
    ],
  },
  {
    code: 'DEP',
    practices: [
      {
        text: 'Тренируйте самостоятельные решения на малом: раз в день выбирайте что-то (еду, маршрут, фильм) без сверки с чужим мнением. Мышца автономии растёт от повторов, а не от одного большого шага.',
        textEn:
          'Practice independent decisions on small things: once a day choose something (a meal, a route, a film) without checking someone else’s opinion. The muscle of autonomy grows from reps, not from one big leap.',
        method: 'cbt',
      },
      {
        text: 'Освойте одну ассертивную формулу: «Я понимаю тебя, и при этом мне важно…». Прямая просьба без извинений за собственные потребности — навык, который защищает вашу заботу от превращения в самоотречение.',
        textEn:
          'Learn one assertive formula: “I hear you, and at the same time it matters to me that…”. A direct request without apologizing for your own needs is a skill that keeps your care from turning into self-erasure.',
        method: 'cbt',
      },
    ],
  },
  {
    code: 'OBC',
    practices: [
      {
        text: 'Введите правило «достаточно хорошо»: для рутинных задач заранее назначьте уровень качества 80% и остановитесь на нём. Освободившийся ресурс вкладывайте туда, где точность действительно критична.',
        textEn:
          'Adopt a “good enough” rule: for routine tasks set a quality bar of 80% in advance and stop there. Invest the freed-up resource where precision truly matters.',
        method: 'cbt',
      },
      {
        text: 'Раз в неделю намеренно оставляйте одну мелочь несовершенной и наблюдайте, что ничего не рушится. Толерантность к неопределённости тренируется малыми дозами и делает вашу силу гибче.',
        textEn:
          'Once a week deliberately leave one small thing imperfect and observe that nothing collapses. Tolerance for uncertainty is trained in small doses and makes your strength more flexible.',
        method: 'cbt',
      },
    ],
  },
  // ===== Состояния (не черты) =====
  {
    code: 'BAR',
    practices: [
      {
        text: 'Стабилизируйте «водители ритма»: держите постоянное время сна и подъёма даже в выходные. Регулярность режима — одна из самых доказанных опор при перепадах настроения.',
        textEn:
          'Stabilize your “zeitgebers”: keep a consistent sleep and wake time even on weekends. Routine regularity is one of the best-evidenced anchors for mood swings.',
        method: 'general',
      },
      {
        text: 'Ведите простой трекер настроения и энергии (шкала 1–10 утром и вечером). Ранние сигналы подъёма или спада, замеченные за дни до пика, дают время принять меры — и материал для разговора со специалистом.',
        textEn:
          'Keep a simple mood-and-energy tracker (1–10 in the morning and evening). Early signals of an upswing or dip noticed days before the peak give you time to act — and material for a conversation with a specialist.',
        method: 'general',
      },
      {
        text: 'Цикличность настроения хорошо отзывается на сопровождение специалиста. Если волны мешают жить, разговор с психотерапевтом или психиатром — не «крайняя мера», а точная работа с состоянием, которое поддаётся коррекции.',
        textEn:
          'Mood cyclicity responds well to professional support. If the waves disrupt your life, talking to a psychotherapist or psychiatrist is not a “last resort” but precise work with a state that responds to treatment.',
        method: 'general',
      },
    ],
  },
  {
    code: 'PAG',
    practices: [
      {
        text: 'Замените непрямой протест на одну прямую фразу: «Я не согласен с этим, потому что…». Прямое «нет» ощущается рискованным, но снимает груз накопленного раздражения куда надёжнее, чем промедление или сарказм.',
        textEn:
          'Replace indirect protest with one direct sentence: “I disagree with this because…”. A direct “no” feels risky, but it clears the weight of accumulated resentment far better than procrastination or sarcasm.',
        method: 'cbt',
      },
      {
        text: 'Когда чувствуете глухое сопротивление, спросите себя: «чего я на самом деле хочу в этой ситуации?» и озвучьте это как просьбу, а не как претензию. Названная потребность превращает тихий бунт в диалог.',
        textEn:
          'When you feel a dull resistance, ask yourself: “what do I actually want here?” and voice it as a request, not a grievance. A named need turns quiet rebellion into dialogue.',
        method: 'cbt',
      },
    ],
  },
  {
    code: 'DPR',
    practices: [
      {
        text: 'Используйте поведенческую активацию: запланируйте одно маленькое приятное или осмысленное действие в день и сделайте его, не дожидаясь настроения. Действие часто идёт первым, а желание подтягивается за ним.',
        textEn:
          'Use behavioral activation: schedule one small pleasant or meaningful action a day and do it without waiting for the mood. Action often comes first, and desire follows it.',
        method: 'cbt',
      },
      {
        text: 'Ловите самокритичную мысль и переформулируйте её так, как сказали бы близкому другу. Ваша глубина остаётся, но фильтр «я во всём виноват» смягчается до «мне сейчас трудно, и это объяснимо».',
        textEn:
          'Catch a self-critical thought and rephrase it the way you would to a close friend. Your depth stays, but the filter “it’s all my fault” softens into “this is hard for me right now, and that makes sense”.',
        method: 'cbt',
      },
      {
        text: 'Если пропадает радость и силы надолго — это повод не «взять себя в руки», а обратиться к специалисту. Депрессивный фон корректируется терапией, не отнимая у вас способность видеть глубоко.',
        textEn:
          'If joy and energy vanish for a long stretch, that’s a reason not to “pull yourself together” but to reach out to a specialist. A depressive baseline responds to therapy without taking away your capacity to see deeply.',
        method: 'general',
      },
    ],
  },
  // ===== Тёмная триада =====
  {
    code: 'MAC',
    practices: [
      {
        text: 'В следующих переговорах поставьте цель win-win: найдите исход, при котором выигрывают обе стороны, и предложите его открыто. Стратегия, переведённая в честную сделку, строит репутацию, которая работает на вас годами.',
        textEn:
          'In your next negotiation aim for win-win: find an outcome where both sides gain and propose it openly. Strategy turned into an honest deal builds a reputation that works for you for years.',
        method: 'general',
      },
      {
        text: 'Раз в неделю сознательно выбирайте прозрачность там, где привычнее скрытый ход: скажите о своём интересе прямо. Доверие — единственный ресурс, который расчёт не может подделать, но может накопить.',
        textEn:
          'Once a week deliberately choose transparency where a hidden move feels more natural: state your interest openly. Trust is the one resource calculation cannot fake but can accumulate.',
        method: 'general',
      },
    ],
  },
  // ===== Светлая триада =====
  {
    code: 'HUM',
    practices: [
      {
        text: 'Введите «границу заботы»: заранее решите, сколько ресурса вы отдаёте, и оставьте часть себе без чувства вины. Забота о себе — не эгоизм, а условие, при котором вашего тепла хватит надолго.',
        textEn:
          'Set a “care boundary”: decide in advance how much resource you give and keep a portion for yourself without guilt. Self-care is not selfishness but the condition that makes your warmth last.',
        method: 'schema',
      },
      {
        text: 'Раз в день замечайте сигналы собственной усталости так же внимательно, как чужую боль. Если вы регулярно опустошены — это не «мало старания», а звонок о том, что пора восстановиться.',
        textEn:
          'Once a day notice your own signs of fatigue as attentively as you notice others’ pain. If you’re regularly drained, that’s not “not trying hard enough” but a signal that it’s time to recover.',
        method: 'schema',
      },
    ],
  },
  {
    code: 'KAN',
    practices: [
      {
        text: 'Перед тем как вынести моральный вердикт, добавьте вопрос о контексте: «что я не знаю о ситуации этого человека?». Правило существует ради людей, а не наоборот — контекст возвращает принципам человечность.',
        textEn:
          'Before passing a moral verdict, add a question about context: “what don’t I know about this person’s situation?”. Rules exist for people, not the other way around — context returns humanity to principles.',
        method: 'cbt',
      },
      {
        text: 'Потренируйте гибкость на малом: раз в неделю сознательно сделайте исключение из собственного правила там, где цена ошибки невелика. Принцип, который умеет гнуться, крепче того, что ломается.',
        textEn:
          'Practice flexibility on small things: once a week deliberately make an exception to your own rule where the cost of error is low. A principle that can bend is stronger than one that snaps.',
        method: 'cbt',
      },
    ],
  },
  {
    code: 'FAI',
    practices: [
      {
        text: 'Примите принцип «доверяй и проверяй»: давайте аванс доверия, но привязывайте его к небольшим проверяемым шагам. Доверие как осознанный выбор ценнее, чем доверие как слепота, — и защищает вас от тех, кто им пользуется.',
        textEn:
          'Adopt “trust but verify”: extend an advance of trust, but tie it to small verifiable steps. Trust as a deliberate choice is worth more than trust as blindness — and shields you from those who exploit it.',
        method: 'cbt',
      },
      {
        text: 'Когда замечаете, что кто-то раз за разом обходится с вашим доверием как с ресурсом, разрешите себе назвать это вслух. Ваша вера в людей не обязана быть безусловной, чтобы оставаться настоящей.',
        textEn:
          'When you notice someone repeatedly treating your trust as a resource, allow yourself to name it out loud. Your faith in people doesn’t have to be unconditional to remain genuine.',
        method: 'general',
      },
    ],
  },
  // ===== Деструктивные паттерны =====
  {
    code: 'SAD',
    practices: [
      {
        text: 'Направляйте азарт борьбы в арены с правилами: спорт, дебаты, стратегические игры, конкурентные проекты. Там ваша жёсткость — сила и драйв, а не риск задеть того, кто не подписывался на схватку.',
        textEn:
          'Channel the thrill of contest into rule-bound arenas: sport, debate, strategy games, competitive projects. There your hardness is strength and drive, not a risk of hurting someone who never signed up for the fight.',
        method: 'general',
      },
      {
        text: 'Тренируйте эмпатию как навык: в момент чужого проигрыша задержитесь на секунду и назовите, что сейчас чувствует другой. Если чужая боль радует сама по себе, без выгоды для вас, — это сигнал присмотреться к себе.',
        textEn:
          'Train empathy as a skill: in the moment of someone’s defeat, pause a second and name what the other person is feeling. If another’s pain pleases you in itself, with no gain for you, that’s a signal to look inward.',
        method: 'schema',
      },
    ],
  },
  {
    code: 'MAS',
    practices: [
      {
        text: 'Раз в день делайте выбор в пользу лёгкого пути там, где привыкли выбирать трудный, и отслеживайте, что мир не наказывает за это. Страдание не обязано быть ценой за право чувствовать себя настоящим.',
        textEn:
          'Once a day choose the easy path where you’re used to choosing the hard one, and notice that the world doesn’t punish you for it. Suffering doesn’t have to be the price of feeling real.',
        method: 'schema',
      },
      {
        text: 'Практикуйте самосострадание: в трудный момент обратитесь к себе теми словами, которыми поддержали бы близкого. Если вы систематически выбираете то, что причиняет боль, — это паттерн, а не судьба, и он поддаётся терапии.',
        textEn:
          'Practice self-compassion: in a hard moment speak to yourself the way you would support a loved one. If you systematically choose what hurts, it’s a pattern, not fate — and it responds to therapy.',
        method: 'schema',
      },
    ],
  },
  // ===== Спектр развития =====
  {
    code: 'ASD',
    practices: [
      {
        text: 'Настройте среду под себя: договаривайтесь о прямых, буквальных правилах вместо намёков, закладывайте время на восстановление после «людных» дней. Это не слабость, а грамотное управление своим ресурсом внимания.',
        textEn:
          'Tailor the environment to yourself: negotiate direct, literal rules instead of hints, and build in recovery time after people-heavy days. This isn’t weakness but smart management of your attention budget.',
        method: 'general',
      },
      {
        text: 'Снижайте сенсорный шум точечно: наушники, приглушённый свет, паузы в тишине — заранее, а не когда уже перегружены. Регуляция сенсорики до пика утомления сохраняет вашу главную силу — глубину фокуса.',
        textEn:
          'Reduce sensory noise proactively: headphones, dimmed light, quiet breaks — before overload, not after. Regulating sensory input ahead of the fatigue peak preserves your core strength: depth of focus.',
        method: 'general',
      },
    ],
  },
  {
    code: 'DIR',
    practices: [
      {
        text: 'Перед тем как сказать неудобную правду, задайте один вопрос: «просят ли её сейчас?». Не всякая правда — подарок, если её не просили; честность плюс такт бьёт сильнее, чем честность в лоб.',
        textEn:
          'Before delivering an uncomfortable truth, ask one question: “is it being asked for right now?”. Not every truth is a gift if no one requested it; honesty plus tact lands harder than honesty head-on.',
        method: 'general',
      },
      {
        text: 'Тренируйте «правду в обёртке»: сначала назовите намерение («хочу помочь, а не задеть»), потом факт. Готовность собеседника услышать вырастает, и ваша прямота начинает работать на отношения, а не против них.',
        textEn:
          'Practice “truth with a frame”: first state your intention (“I want to help, not to wound”), then the fact. The listener’s readiness to hear grows, and your directness starts working for relationships rather than against them.',
        method: 'general',
      },
    ],
  },
  {
    code: 'ALX',
    practices: [
      {
        text: 'Расширяйте словарь эмоций: держите под рукой список из 10–12 чувств и раз в день выбирайте то, что ближе всего к текущему состоянию. Называние — навык, и он тренируется, как любой другой.',
        textEn:
          'Expand your emotion vocabulary: keep a list of 10–12 feelings handy and once a day pick the one closest to your current state. Naming is a skill, and it trains like any other.',
        method: 'general',
      },
      {
        text: 'Читайте эмоции через тело: заметив напряжение, усталость или ком в горле, спросите «какое чувство могло бы так звучать?». Ваши эмоции не отсутствуют — они говорят на языке тела, и его можно научиться переводить.',
        textEn:
          'Read emotions through the body: noticing tension, fatigue, or a lump in the throat, ask “what feeling might sound like this?”. Your emotions aren’t absent — they speak the language of the body, and you can learn to translate it.',
        method: 'general',
      },
    ],
  },
]

/** Получить практики по коду шкалы */
export function getGrowthPractices(code: PersonalityTypeCode): GrowthPractice[] {
  return GROWTH_PROFILES.find((p) => p.code === code)?.practices ?? []
}
