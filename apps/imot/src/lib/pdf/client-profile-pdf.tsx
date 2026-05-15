import type {
  BodyProfile,
  Client,
  EnergyProfile,
  NeuroPsychProfile,
  NumerologyProfile,
  StyleProfile,
} from '@/generated/prisma'
import { Document, Page, Text, View } from '@react-pdf/renderer'
// oxlint-disable-next-line no-unassigned-import
import './fonts' // Регистрация шрифта Roboto с поддержкой кириллицы
import { pdfStyles } from './styles'

/**
 * ТИПЫ ДЛЯ PDF ПРОФИЛЯ КЛИЕНТА
 */
export interface ClientProfilePDFData {
  client: Pick<Client, 'id' | 'name' | 'email' | 'phone' | 'birthdate' | 'gender'>
  numerology?: NumerologyProfile | null
  neuroPsych?: NeuroPsychProfile | null
  energy?: EnergyProfile | null
  body?: BodyProfile | null
  style?: StyleProfile | null
}

/**
 * PDF ДОКУМЕНТ: ПРОФИЛЬ КЛИЕНТА
 * Включает все 5 уровней диагностики ИМОТ
 */
export function ClientProfilePDF({ data }: { data: ClientProfilePDFData }) {
  const { client, numerology, neuroPsych, energy, body, style } = data

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* ЗАГОЛОВОК */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.title}>Профиль клиента: {client.name}</Text>
          <Text style={pdfStyles.textSmall}>Дата формирования: {new Date().toLocaleDateString('ru-RU')}</Text>
        </View>

        {/* ОСНОВНАЯ ИНФОРМАЦИЯ */}
        <View style={[pdfStyles.section, pdfStyles.sectionBorder]}>
          <Text style={pdfStyles.subtitle}>Основная информация</Text>
          <View style={pdfStyles.metric}>
            <Text style={pdfStyles.metricLabel}>ФИО:</Text>
            <Text style={pdfStyles.metricValue}>{client.name}</Text>
          </View>
          <View style={pdfStyles.metric}>
            <Text style={pdfStyles.metricLabel}>Email:</Text>
            <Text style={pdfStyles.metricValue}>{client.email}</Text>
          </View>
          {client.phone && (
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Телефон:</Text>
              <Text style={pdfStyles.metricValue}>{client.phone}</Text>
            </View>
          )}
          {client.birthdate && (
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Дата рождения:</Text>
              <Text style={pdfStyles.metricValue}>{new Date(client.birthdate).toLocaleDateString('ru-RU')}</Text>
            </View>
          )}
          {client.gender && (
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Пол:</Text>
              <Text style={pdfStyles.metricValue}>
                {client.gender === 'MALE' ? 'Мужской' : client.gender === 'FEMALE' ? 'Женский' : 'Другое'}
              </Text>
            </View>
          )}
        </View>

        {/* 1. НУМЕРОЛОГИЧЕСКИЙ ПРОФИЛЬ */}
        {numerology && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.numerologyBorder]}>
            <Text style={pdfStyles.subtitle}>1. Нумерология - Матрица судьбы</Text>

            {numerology.destinyNumber && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Число судьбы:</Text>
                <Text style={pdfStyles.metricValue}>{numerology.destinyNumber}</Text>
              </View>
            )}

            {numerology.currentCycle && (
              <View>
                <Text style={pdfStyles.heading}>Текущий жизненный цикл</Text>
                <Text style={pdfStyles.text}>{numerology.currentCycle}</Text>
                {numerology.cycleDescription && <Text style={pdfStyles.text}>{numerology.cycleDescription}</Text>}
              </View>
            )}

            {numerology.talents && (
              <View>
                <Text style={pdfStyles.heading}>Таланты и дары</Text>
                <Text style={pdfStyles.text}>{numerology.talents}</Text>
              </View>
            )}

            {numerology.purpose && (
              <View>
                <Text style={pdfStyles.heading}>Предназначение</Text>
                <Text style={pdfStyles.text}>{numerology.purpose}</Text>
              </View>
            )}

            {numerology.karmicLessons && (
              <View>
                <Text style={pdfStyles.heading}>Кармические уроки</Text>
                <Text style={pdfStyles.text}>{numerology.karmicLessons}</Text>
              </View>
            )}
          </View>
        )}

        {/* 2. НЕЙРОПСИХОЛОГИЧЕСКИЙ ПРОФИЛЬ */}
        {neuroPsych && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.neuroPsychBorder]}>
            <Text style={pdfStyles.subtitle}>2. Нейропсихология</Text>

            {neuroPsych.behaviorPatterns && (
              <View>
                <Text style={pdfStyles.heading}>Паттерны поведения</Text>
                <Text style={pdfStyles.text}>{neuroPsych.behaviorPatterns}</Text>
              </View>
            )}

            {neuroPsych.cognitiveStyle && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Когнитивный стиль:</Text>
                <Text style={pdfStyles.metricValue}>{neuroPsych.cognitiveStyle}</Text>
              </View>
            )}

            {neuroPsych.learningStyle && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Стиль обучения:</Text>
                <Text style={pdfStyles.metricValue}>{neuroPsych.learningStyle}</Text>
              </View>
            )}

            {neuroPsych.defenseMechanisms && (
              <View>
                <Text style={pdfStyles.heading}>Защитные механизмы</Text>
                <Text style={pdfStyles.text}>{neuroPsych.defenseMechanisms}</Text>
              </View>
            )}

            {neuroPsych.resourceStates && (
              <View>
                <Text style={pdfStyles.heading}>Ресурсные состояния</Text>
                <Text style={pdfStyles.text}>{neuroPsych.resourceStates}</Text>
              </View>
            )}
          </View>
        )}
      </Page>

      {/* ВТОРАЯ СТРАНИЦА - Энергетика, Тело, Стиль */}
      <Page size="A4" style={pdfStyles.page}>
        {/* 3. ЭНЕРГЕТИЧЕСКИЙ ПРОФИЛЬ */}
        {energy && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.energyBorder]}>
            <Text style={pdfStyles.subtitle}>3. Энергетика - 7 чакр</Text>

            <Text style={pdfStyles.heading}>Состояние чакр (1-10)</Text>
            <View style={pdfStyles.table}>
              {energy.rootChakra !== null && (
                <View style={pdfStyles.metric}>
                  <Text style={pdfStyles.metricLabel}>1. Корневая (Муладхара):</Text>
                  <Text style={pdfStyles.metricValue}>{energy.rootChakra}/10</Text>
                </View>
              )}
              {energy.sacralChakra !== null && (
                <View style={pdfStyles.metric}>
                  <Text style={pdfStyles.metricLabel}>2. Сакральная (Свадхистана):</Text>
                  <Text style={pdfStyles.metricValue}>{energy.sacralChakra}/10</Text>
                </View>
              )}
              {energy.solarPlexusChakra !== null && (
                <View style={pdfStyles.metric}>
                  <Text style={pdfStyles.metricLabel}>3. Солнечное сплетение (Манипура):</Text>
                  <Text style={pdfStyles.metricValue}>{energy.solarPlexusChakra}/10</Text>
                </View>
              )}
              {energy.heartChakra !== null && (
                <View style={pdfStyles.metric}>
                  <Text style={pdfStyles.metricLabel}>4. Сердечная (Анахата):</Text>
                  <Text style={pdfStyles.metricValue}>{energy.heartChakra}/10</Text>
                </View>
              )}
              {energy.throatChakra !== null && (
                <View style={pdfStyles.metric}>
                  <Text style={pdfStyles.metricLabel}>5. Горловая (Вишудха):</Text>
                  <Text style={pdfStyles.metricValue}>{energy.throatChakra}/10</Text>
                </View>
              )}
              {energy.thirdEyeChakra !== null && (
                <View style={pdfStyles.metric}>
                  <Text style={pdfStyles.metricLabel}>6. Третий глаз (Аджна):</Text>
                  <Text style={pdfStyles.metricValue}>{energy.thirdEyeChakra}/10</Text>
                </View>
              )}
              {energy.crownChakra !== null && (
                <View style={pdfStyles.metric}>
                  <Text style={pdfStyles.metricLabel}>7. Коронная (Сахасрара):</Text>
                  <Text style={pdfStyles.metricValue}>{energy.crownChakra}/10</Text>
                </View>
              )}
            </View>

            {energy.energyBlocks && (
              <View>
                <Text style={pdfStyles.heading}>Энергетические блоки</Text>
                <Text style={pdfStyles.text}>{energy.energyBlocks}</Text>
              </View>
            )}

            {energy.moneyChannelLevel !== null && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Денежный канал:</Text>
                <Text style={pdfStyles.metricValue}>{energy.moneyChannelLevel}/10</Text>
              </View>
            )}

            {energy.relationshipEnergy !== null && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Энергия отношений:</Text>
                <Text style={pdfStyles.metricValue}>{energy.relationshipEnergy}/10</Text>
              </View>
            )}

            {energy.vitalityLevel !== null && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Жизненная сила:</Text>
                <Text style={pdfStyles.metricValue}>{energy.vitalityLevel}/10</Text>
              </View>
            )}
          </View>
        )}

        {/* 4. ТЕЛЕСНЫЙ ПРОФИЛЬ */}
        {body && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.bodyBorder]}>
            <Text style={pdfStyles.subtitle}>4. Тело - Карта зажимов</Text>

            {body.tensionMap && (
              <View>
                <Text style={pdfStyles.heading}>Карта зажимов</Text>
                <Text style={pdfStyles.text}>{body.tensionMap}</Text>
              </View>
            )}

            {body.psychosomaticIssues && (
              <View>
                <Text style={pdfStyles.heading}>Психосоматические симптомы</Text>
                <Text style={pdfStyles.text}>{body.psychosomaticIssues}</Text>
              </View>
            )}

            {body.breathingPatterns && (
              <View>
                <Text style={pdfStyles.heading}>Паттерны дыхания</Text>
                <Text style={pdfStyles.text}>{body.breathingPatterns}</Text>
              </View>
            )}

            {body.bodyResources && (
              <View>
                <Text style={pdfStyles.heading}>Телесные ресурсы</Text>
                <Text style={pdfStyles.text}>{body.bodyResources}</Text>
              </View>
            )}

            {body.bodyMindConnection && (
              <View>
                <Text style={pdfStyles.heading}>Связь тело-психика</Text>
                <Text style={pdfStyles.text}>{body.bodyMindConnection}</Text>
              </View>
            )}
          </View>
        )}

        {/* 5. СТИЛЕВОЙ ПРОФИЛЬ */}
        {style && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.styleBorder]}>
            <Text style={pdfStyles.subtitle}>5. Стиль - Самовыражение</Text>

            {style.colorType && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Цветотип:</Text>
                <Text style={pdfStyles.metricValue}>
                  {style.colorType === 'SPRING'
                    ? 'Весна'
                    : style.colorType === 'SUMMER'
                      ? 'Лето'
                      : style.colorType === 'AUTUMN'
                        ? 'Осень'
                        : 'Зима'}
                </Text>
              </View>
            )}

            {style.primaryArchetype && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Основной архетип:</Text>
                <Text style={pdfStyles.metricValue}>{getArchetypeName(style.primaryArchetype)}</Text>
              </View>
            )}

            {style.secondaryArchetype && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Дополнительный архетип:</Text>
                <Text style={pdfStyles.metricValue}>{getArchetypeName(style.secondaryArchetype)}</Text>
              </View>
            )}

            {style.selfExpression && (
              <View>
                <Text style={pdfStyles.heading}>Самовыражение</Text>
                <Text style={pdfStyles.text}>{style.selfExpression}</Text>
              </View>
            )}

            {style.authenticityLevel !== null && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Уровень аутентичности:</Text>
                <Text style={pdfStyles.metricValue}>{style.authenticityLevel}/10</Text>
              </View>
            )}

            {style.innerOuterAlignment && (
              <View>
                <Text style={pdfStyles.heading}>Внешнее = внутреннее</Text>
                <Text style={pdfStyles.text}>{style.innerOuterAlignment}</Text>
              </View>
            )}
          </View>
        )}

        {/* ФУТЕР */}
        <View style={pdfStyles.footer} fixed>
          <Text>ИМОТ - Интегративная Матрица Осознанной Трансформации</Text>
          <Text render={({ pageNumber, totalPages }) => `Страница ${pageNumber} из ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

/**
 * УТИЛИТА: НАЗВАНИЕ АРХЕТИПА НА РУССКОМ
 */
function getArchetypeName(archetype: string): string {
  const archetypes: Record<string, string> = {
    INNOCENT: 'Невинный',
    EVERYMAN: 'Обыватель',
    HERO: 'Герой',
    OUTLAW: 'Бунтарь',
    EXPLORER: 'Исследователь',
    CREATOR: 'Творец',
    RULER: 'Правитель',
    MAGICIAN: 'Маг',
    LOVER: 'Любовник',
    CAREGIVER: 'Заботливый',
    JESTER: 'Шут',
    SAGE: 'Мудрец',
  }
  return archetypes[archetype] || archetype
}
