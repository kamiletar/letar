// Визуальные «сцены» — куратoрские пресеты параметров реактивности `SpinGraphCanvas`. Не новый
// рендер-движок (граф остаётся тем же — гексаграмма Пенроуза + 6 узлов), а разное «настроение»
// того же графа: скорость, теснота орбиты, чувствительность к басу, количество искр, яркость
// свечения, скорость колец-метронома. Тот же принцип, что у патчей звука — куратoрский набор
// стартовых точек, а не свободный конструктор (тот появится позже, если понадобится).

export interface VjSceneParams {
  /** Множитель скорости вращения ядра и орбиты узлов */
  rotationSpeed: number
  /** Множитель радиуса орбиты 6 внешних узлов */
  orbitSpread: number
  /** Множитель того, насколько бас раздувает ядро */
  bassSensitivity: number
  /** Множитель яркости «искр» на верхах вдоль рёбер */
  trebleSparkle: number
  /** Множитель яркости фонового радиального свечения от ядра */
  glowIntensity: number
  /** Множитель скорости расширения колец-метронома (beatRef) */
  ringSpeed: number
}

export interface VjScene {
  id: string
  /** Ear-first ярлык — то, что видит владелец в UI, без музыкальной теории */
  name: string
  /** Одна фраза-метафора — для чего эта сцена (сценарий использования, не техническое описание) */
  mood: string
  params: VjSceneParams
}

// «Классика» — текущее поведение графа без изменений (все множители 1) — контрольная точка,
// с ней сверяются остальные сцены.
export const VJ_SCENES: VjScene[] = [
  {
    id: 'classic',
    name: 'Классика',
    mood: 'Ровный баланс — как граф вёл себя с самого начала',
    params: { rotationSpeed: 1, orbitSpread: 1, bassSensitivity: 1, trebleSparkle: 1, glowIntensity: 1, ringSpeed: 1 },
  },
  {
    id: 'drone',
    name: 'Дрон',
    mood: 'Для варгана и диджериду — медленное дыхание, широкое мягкое свечение',
    params: {
      rotationSpeed: 0.35,
      orbitSpread: 0.8,
      bassSensitivity: 0.6,
      trebleSparkle: 0.4,
      glowIntensity: 1.6,
      ringSpeed: 0.5,
    },
  },
  {
    id: 'breakcore',
    name: 'Брейккор',
    mood: 'Для DnB/breakcore — граф крутится и искрит на пределе, орбита тесная и быстрая',
    params: {
      rotationSpeed: 2.2,
      orbitSpread: 1.3,
      bassSensitivity: 1.1,
      trebleSparkle: 2,
      glowIntensity: 0.9,
      ringSpeed: 1.8,
    },
  },
  {
    id: 'bass-focus',
    name: 'Бас-фокус',
    mood: 'Ядро дышит только на баса — для Reese-баса, всё остальное почти неподвижно',
    params: {
      rotationSpeed: 0.5,
      orbitSpread: 0.6,
      bassSensitivity: 2.2,
      trebleSparkle: 0.3,
      glowIntensity: 1.3,
      ringSpeed: 0.8,
    },
  },
  {
    id: 'minimal',
    name: 'Минимал',
    mood: 'Тише — для сцены, где граф не должен отвлекать от голоса/текста',
    params: {
      rotationSpeed: 0.5,
      orbitSpread: 0.75,
      bassSensitivity: 0.5,
      trebleSparkle: 0,
      glowIntensity: 0.4,
      ringSpeed: 0.7,
    },
  },
]

export const DEFAULT_VJ_SCENE: VjScene = VJ_SCENES[0]
