import { keystaticStorageKind } from '@/lib/keystatic-config'
import { KeystaticApp } from './keystatic'

// Выбираем режим по runtime-окружению сервера, включая staging.
export const dynamic = 'force-dynamic'

/**
 * Root layout для Keystatic CMS
 * Keystatic — отдельное приложение, требует свой html/body
 */
export default function KeystaticLayout() {
  return (
    <html lang="ru">
      <head>
        <title>Keystatic CMS | Kami</title>
      </head>
      <body>
        <KeystaticApp storageKind={keystaticStorageKind} />
      </body>
    </html>
  )
}
