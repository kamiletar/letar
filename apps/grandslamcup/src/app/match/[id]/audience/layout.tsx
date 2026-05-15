/**
 * Layout для страницы зрительского голосования.
 *
 * Подгружает официальный telegram-web-app.js скрипт чтобы:
 * 1) `window.Telegram.WebApp` был доступен даже если страница открыта НЕ через webApp кнопку
 *    (например, по прямой ссылке в обычном Telegram in-app браузере или в Safari);
 * 2) initData/MainButton/HapticFeedback API работали стабильно на всех платформах.
 *
 * Когда страница открыта через `webApp(...)` кнопку из канала — Telegram сам инжектит
 * этот скрипт, но дублирующая загрузка идемпотентна и не вредит.
 */

import Script from 'next/script'

export default function AudienceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </>
  )
}
