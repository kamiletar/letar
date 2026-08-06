import type { PersonalityTypeCode } from './personality-types'

/** Взаимодействие между двумя типами */
export interface TypeInteraction {
  /** Первый тип в паре */
  type1: PersonalityTypeCode
  /** Второй тип в паре */
  type2: PersonalityTypeCode
  /** Динамика (краткое описание отношений) */
  dynamic: string
  dynamicEn: string
  /** Сильные стороны союза */
  strengths: string
  strengthsEn: string
  /** Зоны риска */
  risks: string
  risksEn: string
  /** Совет */
  advice: string
  adviceEn: string
}

/** Модификатор настроения/поведения */
export interface MoodModifier {
  code: PersonalityTypeCode
  /** Текст для партнёра */
  forPartner: string
  forPartnerEn: string
  /** Текст для человека с этой чертой */
  forSelf: string
  forSelfEn: string
}

/** Все парные взаимодействия типов (порядок не важен) */
export const TYPE_INTERACTIONS: TypeInteraction[] = [
  // ===== Cluster A x Cluster A =====
  {
    type1: 'PAR',
    type2: 'SZD',
    dynamic: 'Два одиночки, которые уважают чужие границы.',
    dynamicEn: "Two loners who respect each other's boundaries.",
    strengths:
      'Минимум конфликтов, взаимное ненавязчивое присутствие, общее ценение тишины и автономии. Оба не требуют постоянного контакта.',
    strengthsEn:
      'Minimal conflict, unobtrusive mutual presence, shared appreciation for quiet and autonomy. Neither requires constant contact.',
    risks:
      'Отношения могут стать настолько дистантными, что потеряют содержание. Оба избегают эмоциональной близости, и никто не делает первый шаг.',
    risksEn:
      'Relationships can become so distant they lose substance. Both avoid emotional intimacy, and neither takes the first step.',
    advice:
      'Создайте ритуал совместного времени — даже молчаливого. Параллельное чтение, прогулка, совместный ужин без гаджетов.',
    adviceEn:
      'Create a ritual of shared time—even in silence. Reading in parallel, a walk together, shared meals without devices.',
  },
  {
    type1: 'PAR',
    type2: 'SZT',
    dynamic: 'Подозрительный аналитик и интуитивный мечтатель.',
    dynamicEn: 'A suspicious analyst and an intuitive dreamer.',
    strengths:
      'Оба ценят глубину мышления и не верят «официальной версии». Могут увлечённо обсуждать альтернативные идеи и скрытые паттерны.',
    strengthsEn:
      'Both value depth of thought and distrust the "official story." You can passionately explore alternative ideas and hidden patterns together.',
    risks:
      'Взаимное усиление недоверия к миру. PAR видит заговоры, SZT — мистические знаки, вместе они могут уйти в параллельную реальность.',
    risksEn:
      'Mutual reinforcement of distrust in the world. PAR sees conspiracies, SZT sees mystical signs—together you may drift into an alternate reality.',
    advice: 'Включите в круг общения хотя бы одного прагматика, который «заземлит» ваши теории.',
    adviceEn: 'Include at least one pragmatist in your circle who can "ground" your theories back to reality.',
  },
  {
    type1: 'SZD',
    type2: 'SZT',
    dynamic: 'Два интроверта с богатым внутренним миром.',
    dynamicEn: 'Two introverts with rich inner worlds.',
    strengths:
      'Глубокое взаимопонимание без слов. Оба ценят пространство и не навязываются. Могут проводить часы в параллельной творческой деятельности.',
    strengthsEn:
      "Deep understanding without words. Both value space and don't impose on each other. You can spend hours in parallel creative activity.",
    risks: 'Полная изоляция от внешнего мира. Оба не инициируют социальные контакты, и пара может «закуклиться».',
    risksEn:
      'Total isolation from the outside world. Neither initiates social contact, and the couple can become completely withdrawn.',
    advice:
      'Договоритесь о минимальном социальном графике — хотя бы одна совместная активность с другими людьми в месяц.',
    adviceEn: 'Agree on a minimum social schedule—at least one shared activity with others monthly.',
  },

  // ===== Cluster A x Cluster B =====
  {
    type1: 'PAR',
    type2: 'ANT',
    dynamic: 'Надзиратель и нарушитель.',
    dynamicEn: 'A watchdog and a rule-breaker.',
    strengths:
      'Мощная пара в бизнесе — PAR контролирует риски, ANT генерирует смелые решения. Взаимное уважение к силе характера.',
    strengthsEn:
      'Powerful team in business—PAR controls risks, ANT generates bold solutions. Mutual respect for strength of character.',
    risks:
      'Борьба за власть. PAR подозревает ANT в манипуляциях (часто обоснованно). ANT раздражается от постоянного контроля.',
    risksEn: 'Power struggle. PAR suspects ANT of manipulation (often justified). ANT chafes under constant control.',
    advice:
      'Чётко разделите зоны ответственности. Доверяйте в рамках договорённостей, не пытайтесь контролировать друг друга за их пределами.',
    adviceEn:
      "Clearly divide areas of responsibility. Trust within agreed boundaries; don't try to control each other beyond them.",
  },
  {
    type1: 'PAR',
    type2: 'BOR',
    dynamic: 'Настороженность встречает эмоциональный ураган.',
    dynamicEn: 'Wariness meets emotional turbulence.',
    strengths:
      'BOR даёт PAR ту интенсивность отношений, которой ему втайне не хватает. PAR даёт BOR ощущение «нас защищают».',
    strengthsEn:
      'BOR gives PAR the relationship intensity he secretly craves. PAR gives BOR a sense of being protected.',
    risks:
      'Взрывоопасная смесь. Малейший повод для ревности или подозрения — и оба эскалируют. PAR интерпретирует эмоции BOR как «доказательство неверности».',
    risksEn:
      "Combustible mix. The slightest hint of jealousy or suspicion triggers escalation. PAR misreads BOR's emotions as proof of infidelity.",
    advice:
      'Установите правило: обсуждать тревоги словами, а не действиями. «Я чувствую тревогу» вместо «Ты меня обманываешь».',
    adviceEn:
      'Make a rule: address worries with words, not actions. "I\'m feeling anxious" instead of "You\'re betraying me."',
  },
  {
    type1: 'PAR',
    type2: 'HIS',
    dynamic: 'Детектив и актриса.',
    dynamicEn: 'A detective and an actress.',
    strengths:
      'HIS своей открытостью может постепенно растопить настороженность PAR. PAR даёт HIS чувство «меня видят по-настоящему», а не только поверхностное восхищение.',
    strengthsEn:
      "HIS's openness can gradually thaw PAR's suspicion. PAR gives HIS a sense of being truly seen, not just superficially admired.",
    risks:
      'PAR интерпретирует общительность HIS как флирт. HIS чувствует себя под постоянным наблюдением и задыхается.',
    risksEn: "PAR interprets HIS's sociability as flirting. HIS feels constantly watched and suffocates.",
    advice:
      'PAR — не всё, что выглядит как флирт, является флиртом. HIS — ваша прозрачность поможет: рассказывайте партнёру о своих контактах сами.',
    adviceEn:
      'PAR—not everything that looks like flirting is flirting. HIS—your transparency helps: share your contacts with your partner proactively.',
  },
  {
    type1: 'PAR',
    type2: 'NAR',
    dynamic: 'Два сильных характера, каждый уверен в своей правоте.',
    dynamicEn: 'Two strong characters, each convinced of their rightness.',
    strengths:
      'Взаимное уважение к интеллекту и силе. Оба умеют стратегически мыслить. Мощная пара в конкурентной среде.',
    strengthsEn:
      'Mutual respect for intellect and strength. Both think strategically. A powerful couple in competitive environments.',
    risks:
      'NAR воспринимает подозрительность PAR как неуважение. PAR видит в самоуверенности NAR попытку доминирования.',
    risksEn: "NAR sees PAR's suspicion as disrespect. PAR sees NAR's confidence as a dominance grab.",
    advice:
      'Признайте сильные стороны друг друга вслух. PAR: «Я ценю твою уверенность». NAR: «Я ценю твою проницательность».',
    adviceEn:
      'Acknowledge each other\'s strengths aloud. PAR: "I appreciate your confidence." NAR: "I appreciate your insight."',
  },
  {
    type1: 'SZD',
    type2: 'ANT',
    dynamic: 'Тихий наблюдатель и активный деятель.',
    dynamicEn: 'A quiet observer and an active doer.',
    strengths: 'Оба независимы и не требуют эмоциональных излияний. ANT действует, SZD не мешает. Минимум драмы.',
    strengthsEn: "Both independent, neither needs emotional dramatics. ANT acts, SZD doesn't interfere. Minimal drama.",
    risks: 'Полное отсутствие эмоционального контакта. Отношения могут выглядеть как соседство, а не партнёрство.',
    risksEn: 'Complete lack of emotional connection. Relationships can look more like roommates than partners.',
    advice: 'Найдите одну общую деятельность — проект, хобби, путешествие. Связь строится через совместный опыт.',
    adviceEn: 'Find one shared activity—a project, hobby, or trip. Connection builds through shared experience.',
  },
  {
    type1: 'SZD',
    type2: 'BOR',
    dynamic: 'Айсберг встречает вулкан.',
    dynamicEn: 'An iceberg meets a volcano.',
    strengths:
      'BOR привносит эмоции, которых SZD не хватает. SZD даёт BOR стабильность и «тихую гавань». Взаимная компенсация.',
    strengthsEn: 'BOR brings the emotion SZD lacks. SZD offers BOR stability and safe harbor. Mutual compensation.',
    risks: 'BOR интерпретирует сдержанность SZD как отвержение. SZD чувствует себя затопленным эмоциями BOR.',
    risksEn: "BOR misreads SZD's restraint as rejection. SZD feels overwhelmed by BOR's intensity.",
    advice:
      'BOR: его молчание — не отказ, а способ быть рядом. SZD: иногда скажите вслух «Я здесь, мне не всё равно» — даже если кажется очевидным.',
    adviceEn:
      'BOR: their silence is not rejection, it\'s how they show presence. SZD: sometimes say aloud "I\'m here, I care"—even if it seems obvious.',
  },
  {
    type1: 'SZD',
    type2: 'HIS',
    dynamic: 'Противоположности притягиваются — или отталкиваются.',
    dynamicEn: 'Opposites attract—or repel.',
    strengths:
      'HIS помогает SZD выйти в мир. SZD учит HIS ценить тишину и глубину. Оба могут многому научиться друг у друга.',
    strengthsEn:
      'HIS helps SZD engage with the world. SZD teaches HIS to value silence and depth. You can learn much from each other.',
    risks:
      'HIS чувствует себя проигнорированным: «Ему на меня наплевать». SZD чувствует себя истощённым: «Она выкачивает из меня энергию».',
    risksEn: 'HIS feels dismissed: "They don\'t care." SZD feels drained: "They\'re exhausting me."',
    advice: 'Договоритесь о «времени вместе» и «времени порознь». Оба типа потребностей равно важны.',
    adviceEn: 'Agree on "together time" and "apart time." Both needs matter equally.',
  },
  {
    type1: 'SZD',
    type2: 'NAR',
    dynamic: 'Один не нуждается в восхищении, другой — требует его.',
    dynamicEn: 'One needs no admiration; the other demands it.',
    strengths:
      'SZD не конкурирует с NAR за внимание, что снижает конфликтность. NAR может быть «лицом» пары, SZD — «мозгом».',
    strengthsEn: 'SZD doesn\'t compete for attention, reducing conflict. NAR can be the "face," SZD the "brain."',
    risks:
      'NAR чувствует себя нелюбимым: SZD не даёт восхищения, которое NAR нужно. SZD раздражается от постоянной «рекламы себя».',
    risksEn: "NAR feels unloved: SZD doesn't give the admiration NAR craves. SZD resents the constant self-promotion.",
    advice:
      'NAR: найдите источники восхищения вне этих отношений (работа, друзья). SZD: иногда простое «Ты молодец» стоит целого мира.',
    adviceEn:
      'NAR: find admiration sources outside the relationship (work, friends). SZD: sometimes a simple "Well done" means the world.',
  },
  {
    type1: 'SZT',
    type2: 'ANT',
    dynamic: 'Визионер и прагматик.',
    dynamicEn: 'A visionary and a pragmatist.',
    strengths: 'SZT генерирует необычные идеи, ANT воплощает их. Мощный тандем для стартапов и творческих проектов.',
    strengthsEn:
      'SZT generates unusual ideas, ANT makes them happen. A powerful team for startups and creative projects.',
    risks: 'ANT считает идеи SZT оторванными от реальности. SZT чувствует, что ANT «приземляет» его мечты.',
    risksEn: 'ANT thinks SZT\'s ideas lack grounding. SZT feels ANT "clips their wings."',
    advice: 'Создайте процесс: SZT придумывает, ANT оценивает реалистичность, вместе решаете что воплощать.',
    adviceEn: 'Create a process: SZT pitches ideas, ANT assesses viability, together decide what to pursue.',
  },
  {
    type1: 'SZT',
    type2: 'BOR',
    dynamic: 'Два человека, живущих интенсивно, но по-разному.',
    dynamicEn: 'Two people living intensely but in different ways.',
    strengths: 'Оба ценят глубину переживаний. Могут создать невероятно богатый эмоционально-интеллектуальный мир.',
    strengthsEn:
      'Both value depth of feeling. You can create a remarkably rich emotional and intellectual world together.',
    risks:
      'Усиление нестабильности. BOR раскачивает эмоции, SZT добавляет необычные интерпретации — вместе могут уходить далеко от реальности.',
    risksEn:
      'Amplified instability. BOR intensifies emotions, SZT adds unusual interpretations—together you drift far from reality.',
    advice:
      'Заведите «якорного друга» — кого-то рационального, кто поможет вернуться на землю в моменты взаимной эскалации.',
    adviceEn: 'Find a "grounding friend"—someone rational who helps you return to earth during mutual escalation.',
  },
  {
    type1: 'SZT',
    type2: 'HIS',
    dynamic: 'Мистик и шоумен.',
    dynamicEn: 'A mystic and a showman.',
    strengths:
      'Оба творческие натуры. HIS умеет «продать» идеи SZT миру. SZT даёт HIS глубину, которой тому не хватает.',
    strengthsEn: 'Both are creative. HIS knows how to "sell" SZT\'s ideas to the world. SZT brings depth HIS lacks.',
    risks:
      'HIS считает SZT «слишком странным для общества». SZT считает HIS «слишком поверхностным для настоящего понимания».',
    risksEn: 'HIS thinks SZT is "too strange for society." SZT thinks HIS is "too superficial for real understanding."',
    advice: 'Уважайте разные языки выражения — HIS через внешнее, SZT через внутреннее. Оба подлинны.',
    adviceEn: "Respect different languages of expression—HIS's outer, SZT's inner. Both are authentic.",
  },
  {
    type1: 'SZT',
    type2: 'NAR',
    dynamic: 'Оба верят в свою исключительность — по разным причинам.',
    dynamicEn: 'Both believe in their exceptionality—for different reasons.',
    strengths:
      'Взаимное восхищение уникальностью друг друга. NAR ценит необычность SZT, SZT уважает масштаб мышления NAR.',
    strengthsEn:
      "Mutual admiration for each other's uniqueness. NAR appreciates SZT's unconventionality, SZT respects NAR's scope of thinking.",
    risks: 'Конкуренция за «главного гения». NAR хочет признания, SZT — понимания. Эти потребности не совпадают.',
    risksEn:
      'Competition for "lead genius." NAR craves recognition, SZT craves understanding. These needs don\'t overlap.',
    advice: 'Разделите арены: пусть NAR блистает в одной сфере, SZT — в другой. Не соревнуйтесь, а дополняйте.',
    adviceEn: "Divide arenas: let NAR shine in one sphere, SZT in another. Complement, don't compete.",
  },

  // ===== Cluster B x Cluster B =====
  {
    type1: 'ANT',
    type2: 'BOR',
    dynamic: 'Адреналин и страсть.',
    dynamicEn: 'Adrenaline and passion.',
    strengths: 'Мощная химия. Оба импульсивны, оба живут на полную. Никогда не скучно.',
    strengthsEn: 'Powerful chemistry. Both impulsive, both all-in. Never dull.',
    risks:
      'Эскалация конфликтов до разрушительного уровня. Оба склонны к резким решениям — один хлопает дверью, другой меняет замки.',
    risksEn: 'Conflicts escalate destructively. Both make drastic moves—one storms out, the other changes the locks.',
    advice: 'Договоритесь о «правиле паузы»: при конфликте — 30 минут тишины перед любым действием.',
    adviceEn: 'Agree on a "pause rule": during conflict, take 30 minutes of silence before any action.',
  },
  {
    type1: 'ANT',
    type2: 'HIS',
    dynamic: 'Харизма + смелость = динамит.',
    dynamicEn: 'Charisma + boldness = dynamite.',
    strengths:
      'Зажигательная пара для публичной деятельности. ANT обеспечивает решительность, HIS — коммуникацию. Вместе убедительны.',
    strengthsEn:
      "Explosive team for public work. ANT provides decisiveness, HIS provides communication. Together you're compelling.",
    risks:
      'Оба любят быть главными, но по-разному. ANT — через контроль, HIS — через внимание. Возможна ревность к чужим «поклонникам».',
    risksEn:
      'Both want to lead differently. ANT through control, HIS through attention. Jealousy over admirers is possible.',
    advice: 'Найдите общую сцену, где оба блистаете, но в разных ролях.',
    adviceEn: 'Find a shared stage where you both shine in different roles.',
  },
  {
    type1: 'ANT',
    type2: 'NAR',
    dynamic: 'Два лидера, один трон.',
    dynamicEn: 'Two leaders, one throne.',
    strengths:
      'Огромная коллективная энергия и амбиции. Если направить в одно русло — могут свернуть горы. Взаимное уважение к силе.',
    strengthsEn:
      'Immense combined energy and ambition. If aligned, you can move mountains. Mutual respect for strength.',
    risks: 'Жёсткая борьба за доминирование. Оба не умеют уступать. Конфликты принципиальны и бескомпромиссны.',
    risksEn: 'Hard fight for dominance. Neither knows how to yield. Conflicts are principled and uncompromising.',
    advice: 'Разделите территории с абсолютной чёткостью. Один ведёт в одном, другой — в другом. Не пересекайтесь.',
    adviceEn: "Divide territories with crystal clarity. One leads here, the other there. Don't overlap.",
  },
  {
    type1: 'BOR',
    type2: 'HIS',
    dynamic: 'Эмоциональный фейерверк.',
    dynamicEn: 'Emotional fireworks.',
    strengths: 'Оба выразительны, эмоциональны, страстны. Способны на глубокую связь и яркие совместные переживания.',
    strengthsEn: 'Both expressive, emotional, passionate. Capable of deep connection and vivid shared experiences.',
    risks: 'Перенасыщение драмой. Оба усиливают эмоции друг друга, и обычный спор превращается в трагедию.',
    risksEn: "Overdone drama. You amplify each other's emotions—a normal disagreement becomes tragedy.",
    advice: 'Введите «шкалу от 1 до 10» для оценки реальной серьёзности проблемы. Это помогает калибровать реакции.',
    adviceEn: 'Use a "1 to 10 scale" to assess how serious a problem really is. This helps calibrate reactions.',
  },
  {
    type1: 'BOR',
    type2: 'NAR',
    dynamic: 'Идеализация встречает грандиозность.',
    dynamicEn: 'Idealization meets grandiosity.',
    strengths: 'BOR умеет восхищаться — и NAR расцветает от этого. NAR даёт BOR ощущение «особенных» отношений.',
    strengthsEn: 'BOR knows how to admire—and NAR flourishes. NAR gives BOR a sense of "special" connection.',
    risks:
      'Цикл идеализации/обесценивания. BOR сначала боготворит NAR, потом низвергает. NAR не выносит критики и уходит. Оба чувствуют себя преданными.',
    risksEn:
      "Idealization-devaluation cycle. BOR worships NAR, then demolishes them. NAR can't handle criticism and leaves. Both feel betrayed.",
    advice:
      'Помните: ваш партнёр — не бог и не дьявол. Он человек с достоинствами и недостатками. Учитесь видеть середину.',
    adviceEn:
      "Remember: your partner is neither god nor devil. They're human—with strengths and flaws. Learn to see the middle ground.",
  },
  {
    type1: 'HIS',
    type2: 'NAR',
    dynamic: 'Два солнца на одном небе.',
    dynamicEn: 'Two suns in one sky.',
    strengths:
      'Яркая, заметная пара. Оба стремятся к красивой жизни, публичному успеху, признанию. Вместе — харизма на двоих.',
    strengthsEn:
      'Bright, visible couple. Both seek beautiful life, public success, recognition. Together—charisma times two.',
    risks: 'Конкуренция за внимание в одной и той же комнате. Оба хотят быть главной звездой.',
    risksEn: 'Competing for attention in the same room. Both want to be the main star.',
    advice: 'Станьте звёздным дуэтом, а не конкурентами. Усиливайте друг друга, а не затмевайте.',
    adviceEn: 'Be a stellar duo, not competitors. Amplify each other instead of eclipsing.',
  },

  // ===== Cluster B x Cluster C =====
  {
    type1: 'ANT',
    type2: 'AVD',
    dynamic: 'Смелый и осторожный.',
    dynamicEn: 'The bold and the cautious.',
    strengths: 'ANT помогает AVD выйти за рамки страха. AVD учит ANT последствиям импульсивных решений.',
    strengthsEn: 'ANT helps AVD move beyond fear. AVD teaches ANT about consequences of impulsive choices.',
    risks: 'ANT может давить и критиковать нерешительность AVD. AVD замыкается от грубости ANT.',
    risksEn: "ANT can push hard and criticize AVD's hesitation. AVD withdraws from ANT's bluntness.",
    advice:
      'ANT: ваша задача — поддерживать, не толкать. AVD: ваша задача — хотя бы раз сказать «да», когда хочется сказать «нет».',
    adviceEn: 'ANT: support, don\'t push. AVD: try saying "yes" at least once when you want to say "no."',
  },
  {
    type1: 'ANT',
    type2: 'DEP',
    dynamic: 'Волк и преданный спутник.',
    dynamicEn: 'A wolf and a loyal companion.',
    strengths: 'DEP обеспечивает лояльность и поддержку. ANT даёт направление и защиту.',
    strengthsEn: 'DEP provides loyalty and support. ANT provides direction and protection.',
    risks:
      'Дисбаланс власти. ANT может эксплуатировать готовность DEP уступать. DEP теряет себя в обслуживании партнёра.',
    risksEn:
      "Power imbalance. ANT can exploit DEP's willingness to give in. DEP loses themselves serving their partner.",
    advice:
      'DEP: спросите себя «чего хочу Я?» хотя бы раз в день. ANT: убедитесь, что ваш партнёр счастлив, а не просто послушен.',
    adviceEn:
      'DEP: ask yourself "What do I want?" at least once daily. ANT: ensure your partner is happy, not just obedient.',
  },
  {
    type1: 'ANT',
    type2: 'OBC',
    dynamic: 'Хаос и порядок.',
    dynamicEn: 'Chaos and order.',
    strengths: 'Взаимная компенсация. ANT расшатывает застой OBC, OBC структурирует хаос ANT. Вместе — баланс.',
    strengthsEn: "Mutual compensation. ANT shakes up OBC's stagnation, OBC structures ANT's chaos. Together—balance.",
    risks: 'Ценностный конфликт. OBC живёт по правилам, ANT — вопреки им. Оба уверены, что их путь единственно верный.',
    risksEn: "Values conflict. OBC lives by the rules, ANT against them. Both are sure they're the only one right.",
    advice: 'Примите, что ваш способ жить — не единственный правильный. Ваши различия — это ресурс, не проблема.',
    adviceEn:
      "Accept that your way of living isn't the only right one. Your differences are a resource, not a problem.",
  },
  {
    type1: 'BOR',
    type2: 'AVD',
    dynamic: 'Оба боятся быть отвергнутыми — но реагируют по-разному.',
    dynamicEn: 'Both fear rejection—but react differently.',
    strengths:
      'Глубокое взаимное понимание уязвимости. Оба знают, что такое боль отвержения, и могут быть бережны друг с другом.',
    strengthsEn:
      "Deep mutual understanding of vulnerability. Both know rejection's pain and can be gentle with each other.",
    risks:
      'BOR наступает, AVD отступает. BOR интерпретирует отступление как отвержение и усиливает натиск. Порочный круг.',
    risksEn: 'BOR advances, AVD retreats. BOR interprets retreat as rejection and pushes harder. Vicious cycle.',
    advice: 'Введите кодовое слово для «мне нужна пауза, но я не ухожу». Это разрывает цикл преследования-избегания.',
    adviceEn: 'Create a codeword for "I need a pause, but I\'m not leaving." This breaks the pursuit-avoidance cycle.',
  },
  {
    type1: 'BOR',
    type2: 'DEP',
    dynamic: 'Эмоциональный шторм и тихая гавань.',
    dynamicEn: 'Emotional storm and quiet harbor.',
    strengths: 'DEP даёт BOR стабильность и безусловное принятие. BOR наполняет жизнь DEP интенсивностью и смыслом.',
    strengthsEn:
      "DEP gives BOR stability and unconditional acceptance. BOR fills DEP's life with intensity and meaning.",
    risks:
      'DEP может «раствориться» в обслуживании эмоциональных потребностей BOR, забыв о себе. BOR может начать обесценивать «скучного» DEP.',
    risksEn:
      'DEP can "dissolve" serving BOR\'s emotional needs, forgetting themselves. BOR may start devaluing "boring" DEP.',
    advice: 'DEP: вы не обязаны быть терапевтом партнёра. BOR: замечайте, когда берёте больше, чем даёте.',
    adviceEn: "DEP: you're not obliged to be your partner's therapist. BOR: notice when you take more than you give.",
  },
  {
    type1: 'BOR',
    type2: 'OBC',
    dynamic: 'Эмоции vs логика.',
    dynamicEn: 'Emotions vs. logic.',
    strengths: 'OBC структурирует жизнь, которую BOR переживает хаотично. BOR привносит спонтанность в мир правил OBC.',
    strengthsEn:
      "OBC structures the life BOR experiences chaotically. BOR brings spontaneity into OBC's rule-bound world.",
    risks:
      'OBC пытается «починить» эмоции BOR логикой — это не работает и раздражает обоих. BOR считает OBC «бесчувственным роботом».',
    risksEn:
      'OBC tries to "fix" BOR\'s emotions with logic—it doesn\'t work and frustrates both. BOR sees OBC as a "heartless robot."',
    advice:
      'OBC: не пытайтесь решить чувства — просто выслушайте. BOR: его план на вечер — не попытка вас контролировать, а способ заботы.',
    adviceEn:
      "OBC: don't try to solve feelings—just listen. BOR: their evening plan isn't trying to control you; it's how they care.",
  },
  {
    type1: 'HIS',
    type2: 'AVD',
    dynamic: 'Экстраверт и интроверт.',
    dynamicEn: 'An extrovert and an introvert.',
    strengths: 'HIS вытаскивает AVD из раковины. AVD даёт HIS глубокого слушателя, который ценит его по-настоящему.',
    strengthsEn: 'HIS draws AVD out of their shell. AVD gives HIS a deep listener who truly appreciates them.',
    risks: 'HIS хочет на вечеринку, AVD хочет домой. Постоянный конфликт ритмов.',
    risksEn: 'HIS wants parties, AVD wants home. Constant rhythm clash.',
    advice: 'Компромисс: идёте вместе, но с правом AVD уйти раньше. HIS не обижается, AVD не чувствует вины.',
    adviceEn: 'Compromise: go together, but AVD can leave early. No offense, no guilt.',
  },
  {
    type1: 'HIS',
    type2: 'DEP',
    dynamic: 'Звезда и поклонник.',
    dynamicEn: 'A star and an admirer.',
    strengths:
      'DEP даёт HIS то внимание и восхищение, которое тому необходимо. HIS наполняет жизнь DEP яркостью и событиями.',
    strengthsEn:
      "DEP gives HIS the attention and admiration they need. HIS fills DEP's life with brightness and events.",
    risks:
      'Неравный обмен. HIS привыкает получать восхищение и не замечает потребностей DEP. DEP начинает обслуживать, а не жить.',
    risksEn: "Unequal exchange. HIS grows used to admiration and misses DEP's needs. DEP serves instead of living.",
    advice: 'HIS: спрашивайте «а что хочешь ТЫ?» — и ждите ответа. DEP: ваше мнение равноценно, озвучьте его.',
    adviceEn: 'HIS: ask "What do you want?" and actually listen. DEP: your opinion matters—voice it.',
  },
  {
    type1: 'HIS',
    type2: 'OBC',
    dynamic: 'Праздник и будни.',
    dynamicEn: 'Celebration and everyday life.',
    strengths: 'Отличный баланс для совместного быта: HIS делает жизнь интересной, OBC — функционирующей.',
    strengthsEn: 'Great balance for shared life: HIS makes it interesting, OBC makes it work.',
    risks: 'OBC раздражает «хаос» HIS. HIS задыхается от правил OBC.',
    risksEn: 'OBC gets irritated by HIS\'s "chaos." HIS suffocates under OBC\'s rules.',
    advice:
      'Разделите зоны: OBC управляет бюджетом и логистикой, HIS — социальной жизнью и досугом. Не вмешивайтесь в территорию друг друга.',
    adviceEn:
      "Divide zones: OBC manages budget and logistics, HIS handles social life and leisure. Stay out of each other's territory.",
  },
  {
    type1: 'NAR',
    type2: 'AVD',
    dynamic: 'Громкий и тихий.',
    dynamicEn: 'The loud and the quiet.',
    strengths: 'AVD не конкурирует, что комфортно для NAR. NAR придаёт AVD уверенности через свою силу.',
    strengthsEn: "AVD doesn't compete, which suits NAR. NAR builds AVD's confidence through their strength.",
    risks: 'NAR может задавить хрупкую самооценку AVD критикой. AVD копит обиды молча.',
    risksEn: "NAR can crush AVD's fragile self-esteem with criticism. AVD stockpiles hurts silently.",
    advice:
      'NAR: ваш партнёр не «слабый» — он чувствительный. Обращайтесь бережно. AVD: ваша ценность не зависит от оценки партнёра.',
    adviceEn:
      "NAR: your partner isn't \"weak\"—they're sensitive. Be gentle. AVD: your worth doesn't depend on their judgment.",
  },
  {
    type1: 'NAR',
    type2: 'DEP',
    dynamic: 'Лидер и последователь.',
    dynamicEn: 'Leader and follower.',
    strengths: 'Стабильная ролевая структура. NAR ведёт, DEP поддерживает. Минимум борьбы за власть.',
    strengthsEn: 'Stable role structure. NAR leads, DEP supports. Minimal power struggle.',
    risks: 'Эксплуатация. NAR может принимать как должное преданность DEP. DEP теряет собственную идентичность.',
    risksEn: "Exploitation. NAR can take DEP's loyalty for granted. DEP loses their own identity.",
    advice:
      'NAR: благодарность — не слабость, а инвестиция. Выражайте её. DEP: имейте хотя бы одну сферу, где вы — главный.',
    adviceEn: 'NAR: gratitude is investment, not weakness—express it. DEP: have at least one area where you lead.',
  },
  {
    type1: 'NAR',
    type2: 'OBC',
    dynamic: 'Два перфекциониста с разной мотивацией.',
    dynamicEn: 'Two perfectionists with different motives.',
    strengths:
      'Оба стремятся к высоким стандартам. NAR — ради признания, OBC — ради качества. Вместе производят отличный результат.',
    strengthsEn:
      'Both seek high standards. NAR for recognition, OBC for quality. Together you produce excellent results.',
    risks: 'NAR хочет признания, OBC считает это тщеславием. OBC хочет порядка, NAR считает это занудством.',
    risksEn: 'NAR wants recognition; OBC sees vanity. OBC wants order; NAR sees tedium.',
    advice: 'Цените мотивацию друг друга, даже если она отличается от вашей. Результат — общий.',
    adviceEn: "Value each other's motivation, even if it differs. The result is shared.",
  },

  // ===== Cluster C x Cluster C =====
  {
    type1: 'AVD',
    type2: 'DEP',
    dynamic: 'Два чувствительных человека, нуждающихся в безопасности.',
    dynamicEn: 'Two sensitive people who need security.',
    strengths:
      'Глубокая эмпатия, взаимная бережность. Оба понимают, что такое уязвимость, и обращаются с ней осторожно.',
    strengthsEn: 'Deep empathy, mutual care. Both understand vulnerability and handle it gently.',
    risks: 'Созависимость. Оба боятся потерять друг друга и избегают конфликтов, накапливая невысказанное.',
    risksEn: 'Codependency. Both fear losing each other and avoid conflict, accumulating unspoken feelings.',
    advice:
      'Конфликт — не разрушение, а возможность стать ближе. Научитесь говорить «мне не нравится» — и ваши отношения станут крепче.',
    adviceEn:
      "Conflict isn't destruction—it's a chance to grow closer. Learn to say \"I don't like that\"—your bond will strengthen.",
  },
  {
    type1: 'AVD',
    type2: 'OBC',
    dynamic: 'Тревожный и контролирующий.',
    dynamicEn: 'The anxious and the controlling.',
    strengths:
      'OBC создаёт структуру, в которой AVD чувствует себя безопасно. Предсказуемость OBC — бальзам для тревоги AVD.',
    strengthsEn: "OBC creates structure where AVD feels safe. OBC's predictability soothes AVD's anxiety.",
    risks:
      'OBC может быть слишком критичен к «недостаткам» AVD. AVD воспринимает перфекционизм OBC как личную критику.',
    risksEn: 'OBC can be overly critical of AVD\'s "flaws." AVD takes OBC\'s perfectionism as personal criticism.',
    advice:
      'OBC: ваши стандарты — для вас, не для партнёра. AVD: его замечания о порядке — не про вас, а про его потребность в контроле.',
    adviceEn:
      "OBC: your standards are for you, not your partner. AVD: their remarks about order aren't about you—they're about needing control.",
  },
  {
    type1: 'DEP',
    type2: 'OBC',
    dynamic: 'Исполнительный и организующий.',
    dynamicEn: 'The executor and the organizer.',
    strengths: 'Гладко функционирующий союз. OBC планирует, DEP охотно следует плану. Минимум конфликтов из-за быта.',
    strengthsEn: 'Smoothly functioning union. OBC plans, DEP willingly follows. Minimal conflict over daily life.',
    risks: 'Отношения «начальник–подчинённый». OBC руководит всем, DEP подчиняется всему. Оба теряют равенство.',
    risksEn: 'Boss-subordinate dynamic. OBC directs everything, DEP obeys everything. Both lose equality.',
    advice:
      'Чередуйте роли: пусть DEP иногда выбирает ресторан, маршрут, фильм. Маленькие решения — тренировка автономии.',
    adviceEn:
      'Alternate roles: let DEP choose the restaurant, route, or movie sometimes. Small decisions build autonomy.',
  },

  // ===== Cluster A x Cluster C =====
  {
    type1: 'PAR',
    type2: 'AVD',
    dynamic: 'Оба не доверяют миру — один из подозрительности, другой из страха.',
    dynamicEn: 'Both distrust the world—one from suspicion, one from fear.',
    strengths: 'Взаимное понимание потребности в безопасности. Создают «крепость вдвоём».',
    strengthsEn: 'Mutual understanding of the need for safety. Together you build a "fortress."',
    risks: 'Тотальная изоляция от мира. Оба подкрепляют убеждения друг друга: «снаружи опасно».',
    risksEn: 'Total isolation from the world. You reinforce each other\'s belief: "outside is dangerous."',
    advice: 'Намеренно расширяйте круг — хотя бы одна новая социальная активность в месяц.',
    adviceEn: 'Intentionally expand your circle—at least one new social activity monthly.',
  },
  {
    type1: 'PAR',
    type2: 'DEP',
    dynamic: 'Защитник и преданный спутник.',
    dynamicEn: 'Protector and loyal companion.',
    strengths:
      'DEP даёт PAR безусловную лояльность, которая постепенно размягчает недоверие. PAR защищает DEP от внешних угроз.',
    strengthsEn:
      'DEP gives PAR unconditional loyalty that gradually softens distrust. PAR shields DEP from external threats.',
    risks: 'PAR может стать контролирующим, прикрывая контроль «заботой». DEP принимает контроль за любовь.',
    risksEn: 'PAR can become controlling, masking it as "care." DEP mistakes control for love.',
    advice: 'Любовь — это свобода выбора, а не привязка. Здоровые отношения предполагают доверие без слежки.',
    adviceEn: 'Love is freedom of choice, not chains. Healthy relationships have trust without surveillance.',
  },
  {
    type1: 'PAR',
    type2: 'OBC',
    dynamic: 'Два контролёра с разным фокусом.',
    dynamicEn: 'Two controllers with different focus.',
    strengths:
      'Оба ценят порядок и предсказуемость. PAR контролирует людей, OBC — процессы. Вместе — непробиваемая система.',
    strengthsEn:
      'Both value order and predictability. PAR controls people, OBC controls processes. Together—an impenetrable system.',
    risks: 'Жёсткость. Ни один не готов к спонтанности, и отношения могут стать ригидными.',
    risksEn: 'Rigidity. Neither tolerates spontaneity; relationships can become inflexible.',
    advice: 'Раз в месяц — что-то незапланированное. Позвольте себе удивиться.',
    adviceEn: 'Once a month—do something unplanned. Let yourself be surprised.',
  },
  {
    type1: 'SZD',
    type2: 'AVD',
    dynamic: 'Оба предпочитают дистанцию — но по разным причинам.',
    dynamicEn: 'Both prefer distance—for different reasons.',
    strengths: 'Идеальное уважение личного пространства. Никто не навязывается.',
    strengthsEn: 'Perfect respect for personal space. No one intrudes.',
    risks:
      'Отношения не развиваются, потому что никто не делает шаг навстречу. SZD не чувствует потребности, AVD боится.',
    risksEn: "Relationships don't grow because no one takes the first step. SZD feels no need, AVD is afraid.",
    advice: 'AVD: его дистанция — не отвержение. SZD: иногда инициируйте контакт — для AVD это значит всё.',
    adviceEn: "AVD: their distance isn't rejection. SZD: sometimes initiate contact—it means everything to AVD.",
  },
  {
    type1: 'SZD',
    type2: 'DEP',
    dynamic: 'Одиночка и тот, кому нужен другой.',
    dynamicEn: 'A loner and someone who needs companionship.',
    strengths: 'DEP не требует от SZD притворяться общительным — достаточно просто быть рядом.',
    strengthsEn: "DEP doesn't ask SZD to pretend to be sociable—just being present is enough.",
    risks:
      'DEP чувствует себя нелюбимым из-за эмоциональной сдержанности SZD. SZD чувствует себя «задушенным» потребностями DEP.',
    risksEn: 'DEP feels unloved by SZD\'s emotional reserve. SZD feels "smothered" by DEP\'s needs.',
    advice:
      'Найдите язык любви, который работает для обоих: SZD может показывать заботу делами, DEP — ценить это как достаточное.',
    adviceEn: 'Find a love language that works for both: SZD shows care through action, DEP values that as enough.',
  },
  {
    type1: 'SZD',
    type2: 'OBC',
    dynamic: 'Два методичных интроверта.',
    dynamicEn: 'Two methodical introverts.',
    strengths: 'Тихая, упорядоченная жизнь с минимумом конфликтов. Оба ценят предсказуемость и рутину.',
    strengthsEn: 'Quiet, orderly life with minimal conflict. Both value predictability and routine.',
    risks: 'Отношения могут стать настолько предсказуемыми, что утратят жизнь.',
    risksEn: 'Relationships can become so predictable they lose vitality.',
    advice:
      'Введите «случайный элемент»: новый маршрут, непривычный ресторан, незнакомая книга. Маленькие сюрпризы оживляют.',
    adviceEn:
      'Introduce "random elements": a new route, an unfamiliar restaurant, a new book. Small surprises breathe life in.',
  },
  {
    type1: 'SZT',
    type2: 'AVD',
    dynamic: 'Странный и робкий.',
    dynamicEn: 'The strange and the timid.',
    strengths: 'Оба чувствуют себя «не такими» — и именно это создаёт глубокую связь. Принятие инаковости друг друга.',
    strengthsEn: 'Both feel "different"—that itself creates deep connection. Accepting each other\'s uniqueness.',
    risks: 'Оба избегают мейнстрима и могут усилить взаимную изоляцию.',
    risksEn: "Both avoid mainstream; you can amplify each other's isolation.",
    advice: 'Ваша уникальность — сила. Но не изолируйтесь: найдите сообщество, которое ценит разнообразие.',
    adviceEn: "Your uniqueness is strength. But don't isolate—find a community that values diversity.",
  },
  {
    type1: 'SZT',
    type2: 'DEP',
    dynamic: 'Мечтатель и верный спутник.',
    dynamicEn: 'A dreamer and a loyal companion.',
    strengths:
      'DEP принимает необычности SZT без осуждения. SZT вносит в жизнь DEP элемент волшебства и нестандартного взгляда.',
    strengthsEn: "DEP accepts SZT's quirks without judgment. SZT brings magic and fresh perspective into DEP's life.",
    risks: 'DEP следует за SZT в любые теории, не фильтруя. SZT может «унести» пару далеко от реальности.',
    risksEn: 'DEP follows SZT into any theory unfiltered. SZT can drift far from reality with you.',
    advice:
      'DEP: можно любить и при этом мягко спрашивать «а что говорят факты?». SZT: цените партнёра, который идёт за вами не из слепоты, а из доверия.',
    adviceEn:
      'DEP: you can love and still gently ask "what do the facts say?" SZT: appreciate a partner who follows you from trust, not blindness.',
  },
  {
    type1: 'SZT',
    type2: 'OBC',
    dynamic: 'Хаотичное мышление и жёсткая система.',
    dynamicEn: 'Chaotic thinking and rigid system.',
    strengths: 'OBC заземляет фантазии SZT. SZT расширяет кругозор OBC за пределы списков и таблиц.',
    strengthsEn: "OBC grounds SZT's fantasies. SZT expands OBC's view beyond lists and tables.",
    risks: 'OBC считает SZT «неорганизованным мечтателем». SZT считает OBC «скучным педантом».',
    risksEn: 'OBC sees SZT as "a disorganized dreamer." SZT sees OBC as "a boring pedant."',
    advice: 'Вы — идеальная пара «мечтатель + реализатор», если перестанете критиковать стиль друг друга.',
    adviceEn: 'You\'re the ideal "dreamer + doer" pair if you stop criticizing each other\'s style.',
  },
]

/** Модификаторы настроения для BAR, PAG, DPR (показывать при выраженности >= 40%) */
export const MOOD_MODIFIERS: MoodModifier[] = [
  {
    code: 'BAR',
    forPartner:
      'Вы имеете дело не с двумя разными людьми, а с одним человеком в разных фазах. Не принимайте решений об отношениях в экстремальных точках цикла — ни на пике, ни на дне. Ждите «окна» стабильности.',
    forPartnerEn:
      "You're not dealing with two different people; you're dealing with one person in different phases. Don't make relationship decisions at the extremes of their cycle—neither at the peak nor the trough. Wait for a window of stability.",
    forSelf:
      'Предупредите партнёра о своих циклах. Разработайте совместный «план на случай шторма»: кто звонит, куда обращаться, какие решения откладываются до стабильного периода.',
    forSelfEn:
      'Warn your partner about your cycles. Develop a joint "storm plan": who calls, where to reach out, which decisions are postponed until a stable period.',
  },
  {
    code: 'PAG',
    forPartner:
      'Не обвиняйте: «Ты опять саботируешь!» Вместо этого создайте безопасное пространство: «Мне кажется, тебя что-то беспокоит. Мне важно услышать, что именно, я не буду критиковать».',
    forPartnerEn:
      'Don\'t accuse: "You\'re sabotaging again!" Instead, create a safe space: "I sense something\'s bothering you. I want to hear what it is, and I won\'t criticize."',
    forSelf:
      'Прямое «Мне не нравится вот это» — страшно, но работает лучше, чем месяц молчаливого сопротивления. Каждый раз, когда вы говорите прямо — отношения становятся чище.',
    forSelfEn:
      'Direct "I don\'t like this" is scary, but it works better than a month of silent resistance. Every time you speak directly, your relationship gets clearer.',
  },
  {
    code: 'DPR',
    forPartner:
      'Вы не можете «исправить» его настроение, и это не ваша задача. Не принимайте его пессимизм на свой счёт — это не про вас. Просто будьте рядом без попыток «развеселить».',
    forPartnerEn:
      'You can\'t "fix" their mood, and that\'s not your job. Don\'t take their pessimism personally—it\'s not about you. Just be present without trying to "cheer them up."',
    forSelf:
      'Ваш партнёр старается. То, что его усилия не меняют ваше состояние — не его вина и не ваша. Подумайте о психотерапии — не чтобы «стать весёлым», а чтобы расширить спектр переживаний.',
    forSelfEn:
      'Your partner is trying. That their efforts don\'t change your state isn\'t their fault or yours. Consider therapy—not to "become happy," but to expand your range of experiences.',
  },
]

/** Найти взаимодействие по паре кодов (порядок не важен) */
export function getInteraction(code1: PersonalityTypeCode, code2: PersonalityTypeCode): TypeInteraction | undefined {
  return TYPE_INTERACTIONS.find(
    (i) => (i.type1 === code1 && i.type2 === code2) || (i.type1 === code2 && i.type2 === code1),
  )
}

/** Получить модификатор настроения по коду */
export function getMoodModifier(code: PersonalityTypeCode): MoodModifier | undefined {
  return MOOD_MODIFIERS.find((m) => m.code === code)
}
