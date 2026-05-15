/* oxlint-disable no-array-index-key */
import type { ClientDashboardStats, LevelProgressHistory } from '@/app/_types/client-dashboard.types'
import { Document, Page, Text, View } from '@react-pdf/renderer'
// oxlint-disable-next-line no-unassigned-import
import './fonts' // Регистрация шрифта Roboto с поддержкой кириллицы
import { pdfStyles } from './styles'

/**
 * ТИПЫ ДЛЯ PDF РЕЗУЛЬТАТОВ КЛИЕНТА
 */
export interface ClientResultsPDFData {
  client: {
    name: string
    email: string
  }
  stats: ClientDashboardStats
  histories: LevelProgressHistory[]
  generatedAt: Date
}

/**
 * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
 */
function getStageName(stage: string): string {
  const stageNames: Record<string, string> = {
    DIAGNOSTICS: 'Диагностика',
    INTEGRATION: 'Интеграция',
    STRATEGY: 'Стратегия',
    PRACTICE: 'Практика',
    RESULT: 'Результат',
  }
  return stageNames[stage] || stage
}

function getLevelName(level: string): string {
  const levelNames: Record<string, string> = {
    numerology: 'Нумерология',
    neuroPsych: 'Нейропсихология',
    energy: 'Энергетика',
    body: 'Тело',
    style: 'Стиль',
  }
  return levelNames[level] || level
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * PDF ДОКУМЕНТ: РЕЗУЛЬТАТЫ КЛИЕНТА
 * Включает статистику, прогресс по уровням и историю изменений
 */
export function ClientResultsPDF({ data }: { data: ClientResultsPDFData }) {
  const { client, stats, histories, generatedAt } = data

  return (
    <Document>
      {/* СТРАНИЦА 1: ОБЩАЯ ИНФОРМАЦИЯ И СТАТИСТИКА */}
      <Page size="A4" style={pdfStyles.page}>
        {/* ЗАГОЛОВОК */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.title}>Отчет о прогрессе трансформации</Text>
          <Text style={pdfStyles.text}>{client.name}</Text>
          <Text style={pdfStyles.textSmall}>{client.email}</Text>
          <Text style={pdfStyles.textSmall}>Дата формирования: {formatDate(generatedAt)}</Text>
        </View>

        {/* ОБЩАЯ СТАТИСТИКА */}
        <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.integrationBorder]}>
          <Text style={pdfStyles.subtitle}>Общая статистика</Text>

          {/* Сессии */}
          <View style={pdfStyles.metric}>
            <Text style={pdfStyles.metricLabel}>Сессий проведено:</Text>
            <Text style={pdfStyles.metricValue}>
              {stats.sessions.completed} из {stats.sessions.total}
            </Text>
          </View>
          {stats.sessions.nextSession && (
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Следующая сессия:</Text>
              <Text style={pdfStyles.metricValue}>
                {formatDateTime(stats.sessions.nextSession.date)} ({stats.sessions.nextSession.duration} мин)
              </Text>
            </View>
          )}

          {/* Практики */}
          <View style={[pdfStyles.metric, { marginTop: 8 }]}>
            <Text style={pdfStyles.metricLabel}>Практик выполнено:</Text>
            <Text style={pdfStyles.metricValue}>
              {stats.practices.completed} из {stats.practices.total} ({stats.practices.completionRate.toFixed(0)}%)
            </Text>
          </View>
          <View style={pdfStyles.metric}>
            <Text style={pdfStyles.metricLabel}>Активных практик:</Text>
            <Text style={pdfStyles.metricValue}>{stats.practices.active}</Text>
          </View>

          {/* Результаты */}
          <View style={[pdfStyles.metric, { marginTop: 8 }]}>
            <Text style={pdfStyles.metricLabel}>Всего измерений:</Text>
            <Text style={pdfStyles.metricValue}>{stats.results.total}</Text>
          </View>
          <View style={pdfStyles.metric}>
            <Text style={pdfStyles.metricLabel}>За последний месяц:</Text>
            <Text style={pdfStyles.metricValue}>{stats.results.recentCount}</Text>
          </View>
        </View>

        {/* АКТИВНЫЙ ПЛАН ТРАНСФОРМАЦИИ */}
        {stats.activePlan && (
          <View style={[pdfStyles.section, pdfStyles.sectionBorder, pdfStyles.numerologyBorder]}>
            <Text style={pdfStyles.subtitle}>Текущий план трансформации</Text>
            <Text style={[pdfStyles.text, { marginBottom: 8, fontWeight: 'bold' }]}>{stats.activePlan.title}</Text>
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Текущий этап:</Text>
              <Text style={pdfStyles.metricValue}>{getStageName(stats.activePlan.currentStage)}</Text>
            </View>
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Прогресс:</Text>
              <Text style={pdfStyles.metricValue}>{stats.activePlan.progress}%</Text>
            </View>
            {stats.activePlan.startDate && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Дата начала:</Text>
                <Text style={pdfStyles.metricValue}>{formatDate(stats.activePlan.startDate)}</Text>
              </View>
            )}
            {stats.activePlan.targetDate && (
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Планируемое завершение:</Text>
                <Text style={pdfStyles.metricValue}>{formatDate(stats.activePlan.targetDate)}</Text>
              </View>
            )}
          </View>
        )}

        {/* ПРОГРЕСС ПО УРОВНЯМ - ОБЩИЙ ОБЗОР */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.subtitle}>Прогресс по уровням ИМОТ</Text>
          <View style={{ marginTop: 8 }}>
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Нумерология:</Text>
              <Text style={pdfStyles.metricValue}>{stats.results.byLevel.numerology} измерений</Text>
            </View>
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Нейропсихология:</Text>
              <Text style={pdfStyles.metricValue}>{stats.results.byLevel.neuroPsych} измерений</Text>
            </View>
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Энергетика:</Text>
              <Text style={pdfStyles.metricValue}>{stats.results.byLevel.energy} измерений</Text>
            </View>
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Тело:</Text>
              <Text style={pdfStyles.metricValue}>{stats.results.byLevel.body} измерений</Text>
            </View>
            <View style={pdfStyles.metric}>
              <Text style={pdfStyles.metricLabel}>Стиль:</Text>
              <Text style={pdfStyles.metricValue}>{stats.results.byLevel.style} измерений</Text>
            </View>
          </View>
        </View>

        {/* ФУТЕР */}
        <View style={pdfStyles.footer} fixed>
          <Text>ИМОТ - Интегративная Матрица Осознанной Трансформации</Text>
          <Text render={({ pageNumber, totalPages }) => `Страница ${pageNumber} из ${totalPages}`} />
        </View>
      </Page>

      {/* СТРАНИЦА 2: ДЕТАЛЬНЫЙ ПРОГРЕСС ПО УРОВНЯМ */}
      {stats.levelProgress.length > 0 && (
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.subtitle}>Детальный прогресс по метрикам</Text>
            <Text style={pdfStyles.textSmall}>Последние измерения и динамика изменений</Text>
          </View>

          {/* Группируем по уровням */}
          {['numerology', 'neuroPsych', 'energy', 'body', 'style'].map((level) => {
            const levelItems = stats.levelProgress.filter((item) => item.level === level)
            if (levelItems.length === 0) {
              return null
            }

            return (
              <View key={level} style={[pdfStyles.section, pdfStyles.sectionBorder]} wrap={false}>
                <Text style={pdfStyles.heading}>{getLevelName(level)}</Text>
                {levelItems.map((item) => (
                  <View key={`${item.level}-${item.metric}`} style={{ marginTop: 8 }}>
                    <Text style={pdfStyles.text}>{item.metric}</Text>
                    <View style={pdfStyles.metric}>
                      <Text style={pdfStyles.metricLabel}>Текущее значение:</Text>
                      <Text style={pdfStyles.metricValue}>{item.currentValue.toFixed(1)}</Text>
                    </View>
                    {item.previousValue !== null && (
                      <>
                        <View style={pdfStyles.metric}>
                          <Text style={pdfStyles.metricLabel}>Предыдущее значение:</Text>
                          <Text style={pdfStyles.metricValue}>{item.previousValue.toFixed(1)}</Text>
                        </View>
                        <View style={pdfStyles.metric}>
                          <Text style={pdfStyles.metricLabel}>Изменение:</Text>
                          <Text
                            style={[
                              pdfStyles.metricValue,
                              { color: item.trend === 'up' ? '#00A878' : item.trend === 'down' ? '#D62839' : '#666' },
                            ]}
                          >
                            {item.change > 0 ? '+' : ''}
                            {item.change.toFixed(1)}% {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}
                          </Text>
                        </View>
                      </>
                    )}
                    <View style={pdfStyles.metric}>
                      <Text style={pdfStyles.metricLabel}>Дата измерения:</Text>
                      <Text style={pdfStyles.metricValue}>{formatDate(item.measuredAt)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )
          })}

          {/* ФУТЕР */}
          <View style={pdfStyles.footer} fixed>
            <Text>ИМОТ - Интегративная Матрица Осознанной Трансформации</Text>
            <Text render={({ pageNumber, totalPages }) => `Страница ${pageNumber} из ${totalPages}`} />
          </View>
        </Page>
      )}

      {/* СТРАНИЦА 3+: ИСТОРИЯ ИЗМЕНЕНИЙ ПО УРОВНЯМ */}
      {histories.length > 0 &&
        histories.map((history) => (
          <Page key={`${history.level}-${history.metric}`} size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.section}>
              <Text style={pdfStyles.subtitle}>
                {getLevelName(history.level)}: {history.metric}
              </Text>
              <Text style={pdfStyles.textSmall}>История за последние 90 дней</Text>
            </View>

            {/* Таблица с историей измерений */}
            <View style={pdfStyles.section}>
              <View
                style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderColor: '#ddd',
                  paddingBottom: 4,
                  marginBottom: 8,
                }}
              >
                <Text style={[pdfStyles.textSmall, { flex: 1, fontWeight: 'bold' }]}>Дата</Text>
                <Text style={[pdfStyles.textSmall, { flex: 1, fontWeight: 'bold', textAlign: 'right' }]}>Значение</Text>
              </View>

              {/* oxlint-disable-next-line no-array-index-key */}
              {history.data.slice(0, 30).map((point, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 4,
                    borderBottomWidth: 1,
                    borderColor: '#f0f0f0',
                  }}
                >
                  <Text style={[pdfStyles.textSmall, { flex: 1 }]}>{formatDate(point.date)}</Text>
                  <Text style={[pdfStyles.textSmall, { flex: 1, textAlign: 'right' }]}>{point.value.toFixed(1)}</Text>
                </View>
              ))}

              {history.data.length > 30 && (
                <Text style={[pdfStyles.textSmall, { marginTop: 8, fontStyle: 'italic', color: '#999' }]}>
                  Показано 30 последних измерений из {history.data.length}
                </Text>
              )}
            </View>

            {/* Статистика по истории */}
            <View style={[pdfStyles.section, pdfStyles.sectionBorder]}>
              <Text style={pdfStyles.heading}>Статистика</Text>
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Всего измерений:</Text>
                <Text style={pdfStyles.metricValue}>{history.data.length}</Text>
              </View>
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Минимальное значение:</Text>
                <Text style={pdfStyles.metricValue}>{Math.min(...history.data.map((p) => p.value)).toFixed(1)}</Text>
              </View>
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Максимальное значение:</Text>
                <Text style={pdfStyles.metricValue}>{Math.max(...history.data.map((p) => p.value)).toFixed(1)}</Text>
              </View>
              <View style={pdfStyles.metric}>
                <Text style={pdfStyles.metricLabel}>Среднее значение:</Text>
                <Text style={pdfStyles.metricValue}>
                  {(history.data.reduce((sum, p) => sum + p.value, 0) / history.data.length).toFixed(1)}
                </Text>
              </View>
            </View>

            {/* ФУТЕР */}
            <View style={pdfStyles.footer} fixed>
              <Text>ИМОТ - Интегративная Матрица Осознанной Трансформации</Text>
              <Text render={({ pageNumber, totalPages }) => `Страница ${pageNumber} из ${totalPages}`} />
            </View>
          </Page>
        ))}
    </Document>
  )
}
