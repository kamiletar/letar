import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  // Получаем локаль из URL (через middleware)
  let locale = await requestLocale

  // Проверяем что локаль валидна, иначе используем дефолтную
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    // Пока переводы не нужны, возвращаем пустой объект
    // При необходимости раскомментировать:
    // messages: (await import(`../../messages/${locale}.json`)).default,
    messages: {},
  }
})
