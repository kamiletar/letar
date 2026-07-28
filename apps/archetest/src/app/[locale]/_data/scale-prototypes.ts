/**
 * Соответствие «группа шкал archetest → валидированный прототип» — единственный
 * источник истины для всех мест, где эта таблица показывается.
 *
 * Раньше она была продублирована: на `/for-professionals`, на слайде 02
 * презентации `/dev/presentation` и в PLAN.md. Из-за такого дублирования уже
 * возникал долг v0.23.0 — три экспериментальные шкалы были реализованы,
 * а маркировка на публичной странице отставала на версию.
 *
 * ⚠️ Маппинг идёт на уровне ГРУПП шкал, а не 1:1 со шкалой: одна «Светлая триада»
 * покрывает HUM/KAN/FAI, а PID-5 — сразу тринадцать шкал РЛ. Поэтому это отдельные
 * данные, а не поле в `personality-types.ts` (там `prototype` есть только
 * у экспериментальных шкал, где соответствие как раз 1:1).
 *
 * ⚠️ Принцип лицензионной чистоты: опора на прототипы — **на уровне конструктов,
 * никогда не заимствованием пунктов**. TAS-20 коммерческий, SD3 research-only;
 * все формулировки archetest авторские и ситуационные.
 *
 * DOI сверены вручную 2026-07-28 (у SSIS в справочных материалах ходит неверный).
 */

/** Одна строка таблицы «шкала → прототип» */
export interface ScalePrototype {
  /** Группа шкал archetest (ru) */
  group: string
  /** Группа шкал archetest (en) */
  groupEn: string
  /** Название валидированного прототипа (ru) */
  prototype: string
  /** Название валидированного прототипа (en) */
  prototypeEn: string
  /** Библиографическая ссылка — одинакова для обеих локалей */
  source: string
  /** DOI без префикса `https://doi.org/` */
  doi: string
  /**
   * Короткая форма прототипа для слайда презентации — там таблица уже,
   * а полное название с номером пунктов не помещается
   */
  shortLabel: string
}

export const SCALE_PROTOTYPES: ScalePrototype[] = [
  {
    group: 'Светлая триада (HUM/KAN/FAI)',
    groupEn: 'Light Triad (HUM/KAN/FAI)',
    prototype: 'Light Triad Scale (LTS), 12 пунктов',
    prototypeEn: 'Light Triad Scale (LTS), 12 items',
    source: 'Kaufman et al., 2019',
    doi: '10.3389/fpsyg.2019.00467',
    shortLabel: 'Light Triad Scale — Kaufman et al., 2019',
  },
  {
    group: 'Тёмная триада (MAC/NAR/ANT)',
    groupEn: 'Dark Triad (MAC/NAR/ANT)',
    prototype: 'Short Dark Triad (SD3) / Dirty Dozen',
    prototypeEn: 'Short Dark Triad (SD3) / Dirty Dozen',
    source: 'Jones & Paulhus, 2014 / Jonason & Webster, 2010',
    doi: '10.1177/1073191113514105',
    shortLabel: 'Short Dark Triad — Jones & Paulhus, 2014',
  },
  {
    group: 'Тёмное ядро (MAC/NAR/ANT/SAD)',
    groupEn: 'Dark core (MAC/NAR/ANT/SAD)',
    prototype: 'D-фактор (Dark Factor of Personality), D70/D35/D16',
    prototypeEn: 'The Dark Factor of Personality (D), D70/D35/D16',
    source: 'Moshagen, Hilbig & Zettler, 2018',
    doi: '10.1037/rev0000111',
    shortLabel: 'D-фактор — Moshagen et al., 2018',
  },
  {
    group: 'Садизм (SAD)',
    groupEn: 'Sadism (SAD)',
    prototype: 'Short Sadistic Impulse Scale (SSIS) / ASP',
    prototypeEn: 'Short Sadistic Impulse Scale (SSIS) / ASP',
    source: "O'Meara, Davies & Hammond, 2011",
    doi: '10.1037/a0022400',
    shortLabel: 'ASP / SSIS — Dark Tetrad, Paulhus, 2014',
  },
  {
    group: '13 шкал РЛ (дименсионально)',
    groupEn: '13 personality scales (dimensional)',
    prototype: 'PID-5 (Personality Inventory for DSM-5)',
    prototypeEn: 'PID-5 (Personality Inventory for DSM-5)',
    source: 'Krueger et al., 2012, APA',
    doi: '10.1017/S0033291711002674',
    shortLabel: 'PID-5 — Krueger et al., 2012 (APA)',
  },
  {
    group: 'Систематизация и спектр (ASD)',
    groupEn: 'Systemizing / spectrum (ASD)',
    prototype: 'Autism-Spectrum Quotient (AQ / AQ-10)',
    prototypeEn: 'Autism-Spectrum Quotient (AQ / AQ-10)',
    source: 'Baron-Cohen et al., 2001',
    doi: '10.1023/A:1005653411471',
    shortLabel: 'AQ-10 — Baron-Cohen et al., 2001',
  },
  {
    group: 'Прямота коммуникации (DIR)',
    groupEn: 'Communication directness (DIR)',
    prototype: 'Self-Monitoring Scale (reversed) / HEXACO Sincerity',
    prototypeEn: 'Self-Monitoring Scale (reversed) / HEXACO Sincerity',
    source: 'Snyder, 1974 / Ashton & Lee, 2009',
    doi: '10.1080/00223890902935878',
    shortLabel: 'Self-Monitoring reversed / HEXACO Sincerity',
  },
  {
    group: 'Алекситимия (ALX)',
    groupEn: 'Alexithymia (ALX)',
    prototype: 'Toronto Alexithymia Scale (TAS-20)',
    prototypeEn: 'Toronto Alexithymia Scale (TAS-20)',
    source: 'Bagby, Parker & Taylor, 1994',
    doi: '10.1016/0022-3999(94)90005-1',
    shortLabel: 'TAS-20 — Bagby, Parker & Taylor, 1994',
  },
  {
    group: 'BAR-скрининг',
    groupEn: 'BAR screening',
    prototype: 'MDQ / HCL-32',
    prototypeEn: 'MDQ / HCL-32',
    source: 'Hirschfeld et al., 2000',
    doi: '10.1176/appi.ajp.157.11.1873',
    shortLabel: 'MDQ, HCL-32 (конструкт)',
  },
  {
    group: 'DPR-скрининг',
    groupEn: 'DPR screening',
    prototype: 'PHQ-9 (конструкт, без пункта о суицидальном риске)',
    prototypeEn: 'PHQ-9 (construct only, no suicide-risk item)',
    source: 'Kroenke, Spitzer & Williams, 2001',
    doi: '10.1046/j.1525-1497.2001.016009606.x',
    shortLabel: 'PHQ-9 (конструкт)',
  },
]
