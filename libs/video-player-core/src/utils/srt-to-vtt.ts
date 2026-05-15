/**
 * Конвертация SRT субтитров в WebVTT
 *
 * SRT формат:
 * 1
 * 00:00:01,000 --> 00:00:04,000
 * First subtitle
 *
 * WebVTT формат:
 * WEBVTT
 *
 * 00:00:01.000 --> 00:00:04.000
 * First subtitle
 */

/**
 * Конвертирует SRT контент в WebVTT
 */
export function srtToVtt(srtContent: string): string {
  // Заменяем Windows переводы строк
  let content = srtContent.replace(/\r\n/g, '\n')

  // Заменяем запятые на точки во временных метках
  // 00:00:01,000 --> 00:00:04,000  =>  00:00:01.000 --> 00:00:04.000
  content = content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')

  // Удаляем номера субтитров (цифры на отдельной строке перед временем)
  content = content.replace(/^\d+\s*$/gm, '')

  // Удаляем лишние пустые строки
  content = content.replace(/\n{3,}/g, '\n\n')

  // Добавляем заголовок WebVTT
  return `WEBVTT\n\n${content.trim()}\n`
}

/**
 * Загружает субтитры и конвертирует в Blob URL WebVTT
 *
 * @param url - URL к файлу субтитров (media://, http://, или IPFS)
 * @returns Blob URL с VTT содержимым или null при ошибке
 */
export async function loadSubtitleAsVtt(url: string): Promise<string | null> {
  try {
    // Используем fetch для загрузки (работает с media://, http://)
    const mediaUrl = url.startsWith('media://') ? url : `media://${url.replace(/\\/g, '/')}`

    const response = await fetch(mediaUrl)
    if (!response.ok) {
      console.warn('[Subtitles] Failed to fetch:', mediaUrl, response.status)
      return null
    }

    const content = await response.text()

    // Определяем формат по содержимому или расширению
    const extension = url.split('.').pop()?.toLowerCase()

    if (extension === 'vtt' || content.trim().startsWith('WEBVTT')) {
      // Уже VTT формат
      return URL.createObjectURL(new Blob([content], { type: 'text/vtt' }))
    }

    if (extension === 'srt' || /^\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}/.test(content.trim())) {
      // SRT формат — конвертируем
      const vttContent = srtToVtt(content)
      return URL.createObjectURL(new Blob([vttContent], { type: 'text/vtt' }))
    }

    // Неизвестный формат
    console.warn('[Subtitles] Unknown format:', extension)
    return null
  } catch (error) {
    console.error('[Subtitles] Load error:', error)
    return null
  }
}

/**
 * Освобождает Blob URL
 */
export function revokeSubtitleUrl(url: string | null): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
