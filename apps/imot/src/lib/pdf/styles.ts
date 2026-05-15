import { StyleSheet } from '@react-pdf/renderer'

/**
 * БАЗОВЫЕ СТИЛИ ДЛЯ PDF ДОКУМЕНТОВ IMOT
 * Использует цветовую схему методики
 * Roboto шрифт поддерживает кириллицу
 */
export const pdfStyles = StyleSheet.create({
  // Страница
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
  },

  // Заголовки
  title: {
    fontSize: 24,
    marginBottom: 10,
    color: '#667eea',
    fontFamily: 'Roboto',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 8,
    marginTop: 20,
    color: '#667eea',
    fontFamily: 'Roboto',
    fontWeight: 700,
  },
  heading: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 12,
    color: '#333333',
    fontFamily: 'Roboto',
    fontWeight: 700,
  },

  // Текст
  text: {
    fontSize: 11,
    marginBottom: 4,
    color: '#333333',
    lineHeight: 1.5,
  },
  textBold: {
    fontSize: 11,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: '#333333',
  },
  textSmall: {
    fontSize: 9,
    color: '#666666',
  },

  // Секции
  section: {
    marginBottom: 20,
  },
  sectionBorder: {
    borderLeft: '4px solid #667eea',
    paddingLeft: 12,
    marginBottom: 16,
  },

  // Карточки уровней
  levelCard: {
    marginBottom: 16,
    padding: 12,
    border: '1px solid #e2e8f0',
    borderRadius: 4,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderBottom: '2px solid',
    paddingBottom: 6,
  },
  levelIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  levelTitle: {
    fontSize: 14,
    fontFamily: 'Roboto',
    fontWeight: 700,
  },

  // Списки
  list: {
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    width: 15,
    marginRight: 5,
  },

  // Таблицы
  table: {
    width: '100%',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
    paddingVertical: 6,
  },
  tableHeader: {
    backgroundColor: '#f7fafc',
    borderBottom: '2px solid #cbd5e0',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Roboto',
    fontWeight: 700,
  },

  // Метрики
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingVertical: 4,
    borderBottom: '1px solid #e2e8f0',
  },
  metricLabel: {
    fontSize: 10,
    color: '#666666',
  },
  metricValue: {
    fontSize: 11,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: '#333333',
  },

  // Футер
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999999',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Бейджи статуса
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 9,
    fontFamily: 'Roboto',
    fontWeight: 700,
  },
  badgeGreen: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
  },
  badgeBlue: {
    backgroundColor: '#bee3f8',
    color: '#2c5282',
  },
  badgeYellow: {
    backgroundColor: '#fefcbf',
    color: '#744210',
  },
  badgeRed: {
    backgroundColor: '#fed7d7',
    color: '#742a2a',
  },

  // Цвета уровней IMOT
  numerologyBorder: {
    borderLeftColor: '#FF6B6B',
  },
  neuroPsychBorder: {
    borderLeftColor: '#4ECDC4',
  },
  energyBorder: {
    borderLeftColor: '#FFE66D',
  },
  bodyBorder: {
    borderLeftColor: '#95E1D3',
  },
  styleBorder: {
    borderLeftColor: '#F38181',
  },
  integrationBorder: {
    borderLeftColor: '#667eea',
  },
})
