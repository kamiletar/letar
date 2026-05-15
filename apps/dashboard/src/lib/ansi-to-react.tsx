import { Fragment, type ReactNode } from 'react'

/**
 * Маппинг ANSI цветовых кодов в CSS цвета
 */
const ANSI_COLORS: Record<number, string> = {
  // Обычные цвета
  30: '#000000', // Black
  31: '#ef4444', // Red
  32: '#22c55e', // Green
  33: '#eab308', // Yellow
  34: '#3b82f6', // Blue
  35: '#a855f7', // Magenta
  36: '#06b6d4', // Cyan
  37: '#e5e5e5', // White
  // Яркие цвета
  90: '#737373', // Bright Black (Gray)
  91: '#fca5a5', // Bright Red
  92: '#86efac', // Bright Green
  93: '#fde047', // Bright Yellow
  94: '#93c5fd', // Bright Blue
  95: '#d8b4fe', // Bright Magenta
  96: '#67e8f9', // Bright Cyan
  97: '#ffffff', // Bright White
}

const ANSI_BG_COLORS: Record<number, string> = {
  40: '#000000',
  41: '#ef4444',
  42: '#22c55e',
  43: '#eab308',
  44: '#3b82f6',
  45: '#a855f7',
  46: '#06b6d4',
  47: '#e5e5e5',
  100: '#737373',
  101: '#fca5a5',
  102: '#86efac',
  103: '#fde047',
  104: '#93c5fd',
  105: '#d8b4fe',
  106: '#67e8f9',
  107: '#ffffff',
}

interface TextStyle {
  color?: string
  backgroundColor?: string
  fontWeight?: 'bold'
  fontStyle?: 'italic'
  textDecoration?: 'underline' | 'line-through'
}

/**
 * Парсинг ANSI escape-кодов и конвертация в React элементы
 */
export function parseAnsi(text: string): ReactNode {
  // Ищем ANSI escape-последовательности: ESC[...m
  // eslint-disable-next-line no-control-regex -- ANSI escape codes require control characters
  const ansiRegex = /\x1b\[([0-9;]*)m/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let currentStyle: TextStyle = {}
  let match

  while ((match = ansiRegex.exec(text)) !== null) {
    // Добавляем текст перед этой escape-последовательностью
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index)
      if (textContent) {
        if (Object.keys(currentStyle).length > 0) {
          parts.push(
            <span key={parts.length} style={currentStyle}>
              {textContent}
            </span>
          )
        } else {
          parts.push(<Fragment key={parts.length}>{textContent}</Fragment>)
        }
      }
    }

    // Парсим ANSI коды
    const codes = match[1]
      .split(';')
      .map(Number)
      .filter((n) => !isNaN(n))

    for (const code of codes) {
      if (code === 0) {
        // Сброс
        currentStyle = {}
      } else if (code === 1) {
        // Жирный
        currentStyle = { ...currentStyle, fontWeight: 'bold' }
      } else if (code === 3) {
        // Курсив
        currentStyle = { ...currentStyle, fontStyle: 'italic' }
      } else if (code === 4) {
        // Подчёркивание
        currentStyle = { ...currentStyle, textDecoration: 'underline' }
      } else if (code === 9) {
        // Зачёркивание
        currentStyle = { ...currentStyle, textDecoration: 'line-through' }
      } else if (code >= 30 && code <= 37) {
        // Цвет текста
        currentStyle = { ...currentStyle, color: ANSI_COLORS[code] }
      } else if (code >= 90 && code <= 97) {
        // Яркий цвет текста
        currentStyle = { ...currentStyle, color: ANSI_COLORS[code] }
      } else if (code >= 40 && code <= 47) {
        // Цвет фона
        currentStyle = { ...currentStyle, backgroundColor: ANSI_BG_COLORS[code] }
      } else if (code >= 100 && code <= 107) {
        // Яркий цвет фона
        currentStyle = { ...currentStyle, backgroundColor: ANSI_BG_COLORS[code] }
      } else if (code === 39) {
        // Цвет текста по умолчанию
        const { color: _, ...rest } = currentStyle
        currentStyle = rest
      } else if (code === 49) {
        // Цвет фона по умолчанию
        const { backgroundColor: _, ...rest } = currentStyle
        currentStyle = rest
      }
    }

    lastIndex = match.index + match[0].length
  }

  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex)
    if (textContent) {
      if (Object.keys(currentStyle).length > 0) {
        parts.push(
          <span key={parts.length} style={currentStyle}>
            {textContent}
          </span>
        )
      } else {
        parts.push(<Fragment key={parts.length}>{textContent}</Fragment>)
      }
    }
  }

  // Если ANSI коды не найдены, возвращаем оригинальный текст
  if (parts.length === 0) {
    return text
  }

  return <>{parts}</>
}

/**
 * Компонент для рендеринга текста с ANSI цветовыми кодами
 */
export function AnsiText({ text }: { text: string }) {
  return <>{parseAnsi(text)}</>
}
