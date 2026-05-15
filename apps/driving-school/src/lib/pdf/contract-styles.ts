import { StyleSheet } from '@react-pdf/renderer'

/**
 * СТИЛИ ДЛЯ PDF ДОГОВОРОВ АВТОШКОЛЫ
 * Times New Roman стиль через Roboto для официальных документов
 */
export const contractStyles = StyleSheet.create({
  // Страница
  page: {
    padding: 40,
    paddingTop: 50,
    paddingBottom: 60,
    fontSize: 11,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
    lineHeight: 1.5,
  },

  // Заголовок договора
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Дата и город
  dateCityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateCity: {
    fontSize: 11,
  },

  // Преамбула (стороны)
  preamble: {
    marginBottom: 20,
    textAlign: 'justify',
  },
  preambleText: {
    fontSize: 11,
    lineHeight: 1.6,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 700,
  },

  // Разделы
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 12,
  },
  sectionText: {
    fontSize: 11,
    lineHeight: 1.5,
    textAlign: 'justify',
  },

  // Параграфы
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  paragraphIndent: {
    marginBottom: 8,
    textAlign: 'justify',
    paddingLeft: 20,
  },

  // Нумерованные списки
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  listNumber: {
    width: 25,
    fontSize: 11,
  },
  listText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
  },

  // Блок подписей
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBlock: {
    width: '45%',
  },
  signatureTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    marginTop: 30,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
  },

  // Реквизиты
  requisites: {
    marginTop: 8,
  },
  requisiteRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  requisiteLabel: {
    width: 60,
    fontSize: 9,
    color: '#333',
  },
  requisiteValue: {
    flex: 1,
    fontSize: 9,
  },

  // Таблица
  table: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 4,
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 2,
    borderBottomColor: '#999',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 4,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
    paddingHorizontal: 4,
  },

  // Футер
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Текстовые стили
  text: {
    fontSize: 11,
  },
  textSmall: {
    fontSize: 9,
    color: '#666',
  },
  textBold: {
    fontSize: 11,
    fontWeight: 700,
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
})
