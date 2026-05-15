import KeystaticApp from './keystatic'

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
        <KeystaticApp />
      </body>
    </html>
  )
}
