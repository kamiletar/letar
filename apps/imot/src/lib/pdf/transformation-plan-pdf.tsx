import type { Client, Practice, TransformationPlan, TransformationStage } from '@/generated/prisma'
import { Document, Page, Text, View } from '@react-pdf/renderer'
// oxlint-disable-next-line no-unassigned-import
import './fonts' // Регистрация шрифта Roboto с поддержкой кириллицы
import { pdfStyles } from './styles'

/**
 * ТИПЫ ДЛЯ PDF ПЛАНА ТРАНСФОРМАЦИИ
 */
export interface TransformationPlanPDFData {
  plan: TransformationPlan
  client: Pick<Client, 'id' | 'name' | 'email'>
  practices?: Array<Pick<Practice, 'id' | 'title' | 'description' | 'frequency' | 'duration' | 'level' | 'isCompleted'>>
}

/**
 * PDF ДОКУМЕНТ: ПЛАН ТРАНСФОРМАЦИИ
 * Включает все 5 этапов трансформации и практики
 */
export function TransformationPlanPDF({ data }: { data: TransformationPlanPDFData }) {
  const { plan, client, practices = [] } = data

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* ЗАГОЛОВОК */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.title}>План трансформации</Text>
          <Text style={pdfStyles.text}>Клиент: {client.name}</Text>
          <Text style={pdfStyles.textSmall}>Дата формирования: {new Date().toLocaleDateString('ru-RU')}</Text>
        </View>

        {/* ТЕКУЩИЙ СТАТУС */}
        <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.integrationBorder]}>
          <Text style={pdfStyles.subtitle}>Текущий статус</Text>
          <View style={pdfStyles.metric}>
            <Text style={pdfStyles.metricLabel}>Текущий этап:</Text>
            <Text style={pdfStyles.metricValue}>{getStageName(plan.currentStage)}</Text>
          </View>
          {plan.startDate && (
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Дата начала:</Text>
              <Text style={pdfStyles.metricValue}>{new Date(plan.startDate).toLocaleDateString('ru-RU')}</Text>
            </View>
          )}
          {plan.expectedEndDate && (
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Планируемая дата завершения:</Text>
              <Text style={pdfStyles.metricValue}>{new Date(plan.expectedEndDate).toLocaleDateString('ru-RU')}</Text>
            </View>
          )}
        </View>

        {/* ЭТАП 1: ДИАГНОСТИКА */}
        {plan.diagnosticsDescription && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.numerologyBorder]}>
            <Text style={pdfStyles.subtitle}>1. Диагностика</Text>
            <Text style={pdfStyles.text}>{plan.diagnosticsDescription}</Text>
          </View>
        )}

        {/* ЭТАП 2: ИНТЕГРАЦИЯ */}
        {plan.integrationDescription && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.neuroPsychBorder]}>
            <Text style={pdfStyles.subtitle}>2. Интеграция</Text>
            <Text style={pdfStyles.text}>{plan.integrationDescription}</Text>
          </View>
        )}

        {/* ЭТАП 3: СТРАТЕГИЯ */}
        {plan.strategyDescription && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.energyBorder]}>
            <Text style={pdfStyles.subtitle}>3. Стратегия</Text>
            <Text style={pdfStyles.text}>{plan.strategyDescription}</Text>
          </View>
        )}

        {/* ФУТЕР */}
        <View style={pdfStyles.footer} fixed>
          <Text>ИМОТ - Интегративная Матрица Осознанной Трансформации</Text>
          <Text render={({ pageNumber, totalPages }) => `Страница ${pageNumber} из ${totalPages}`} />
        </View>
      </Page>

      {/* ВТОРАЯ СТРАНИЦА - Практика, Результат, Практики */}
      <Page size="A4" style={pdfStyles.page}>
        {/* ЭТАП 4: ПРАКТИКА */}
        {plan.practiceDescription && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.bodyBorder]}>
            <Text style={pdfStyles.subtitle}>4. Практика</Text>
            <Text style={pdfStyles.text}>{plan.practiceDescription}</Text>
          </View>
        )}

        {/* ЭТАП 5: РЕЗУЛЬТАТ */}
        {plan.expectedResults && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.styleBorder]}>
            <Text style={pdfStyles.subtitle}>5. Ожидаемые результаты</Text>
            <Text style={pdfStyles.text}>{plan.expectedResults}</Text>
          </View>
        )}

        {/* КЛЮЧЕВЫЕ ТОЧКИ */}
        {plan.keyPoints && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.subtitle}>Ключевые точки</Text>
            <Text style={pdfStyles.text}>{plan.keyPoints}</Text>
          </View>
        )}

        {/* ПРИОРИТЕТЫ */}
        {plan.priorities && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.subtitle}>Приоритеты работы</Text>
            <Text style={pdfStyles.text}>{plan.priorities}</Text>
          </View>
        )}

        {/* ПРАКТИКИ */}
        {practices.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.subtitle}>Назначенные практики</Text>
            {practices.map((practice, index) => (
              <View key={practice.id} style={pdfStyles.levelCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={pdfStyles.textBold}>
                    {index + 1}. {practice.title}
                  </Text>
                  {practice.isCompleted && (
                    <View style={[pdfStyles.badge, pdfStyles.badgeGreen]}>
                      <Text>Выполнено</Text>
                    </View>
                  )}
                </View>
                {practice.description && <Text style={pdfStyles.text}>{practice.description}</Text>}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  {practice.frequency && <Text style={pdfStyles.textSmall}>Частота: {practice.frequency}</Text>}
                  {practice.duration && <Text style={pdfStyles.textSmall}>Длительность: {practice.duration}</Text>}
                  {practice.level && <Text style={pdfStyles.textSmall}>Уровень: {getLevelName(practice.level)}</Text>}
                </View>
              </View>
            ))}
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
 * УТИЛИТА: НАЗВАНИЕ ЭТАПА НА РУССКОМ
 */
function getStageName(stage: TransformationStage): string {
  const stages: Record<TransformationStage, string> = {
    DIAGNOSTICS: 'Диагностика',
    INTEGRATION: 'Интеграция',
    STRATEGY: 'Стратегия',
    PRACTICE: 'Практика',
    RESULT: 'Результат',
  }
  return stages[stage] || stage
}

/**
 * УТИЛИТА: НАЗВАНИЕ УРОВНЯ НА РУССКОМ
 */
function getLevelName(level: string): string {
  const levels: Record<string, string> = {
    numerology: 'Нумерология',
    neuropsych: 'Нейропсихология',
    energy: 'Энергетика',
    body: 'Тело',
    style: 'Стиль',
    integration: 'Интеграция',
  }
  return levels[level] || level
}
