import { Font } from '@react-pdf/renderer'

/**
 * РЕГИСТРАЦИЯ ШРИФТОВ ДЛЯ PDF ДОГОВОРОВ
 * Roboto поддерживает кириллицу и доступен через Google Fonts
 */
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf',
      fontWeight: 700,
    },
  ],
})

/**
 * ЭКСПОРТ ДЛЯ ИМПОРТА В КОМПОНЕНТАХ PDF
 * Импортируйте этот файл в начале каждого PDF компонента:
 * import './fonts';
 */
