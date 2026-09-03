'use client'

import { useOfflineServiceWorker, type UseOfflineServiceWorkerOptions } from '@letar/hooks'

export type ServiceWorkerRegistrationProps = UseOfflineServiceWorkerOptions

/**
 * Регистрирует Service Worker по согласию пользователя — парный компонент к
 * {@link OfflineConsentBanner}: баннер ставит согласие, этот его исполняет.
 * Ставится один раз в persistent layout приложения, UI не рендерит.
 *
 * Вся логика — в {@link useOfflineServiceWorker} (`@letar/hooks`), там же разбор трёх ловушек
 * снятия регистрации. Компонент существует затем, что layout приложения — серверный, а хуку
 * нужна клиентская граница.
 *
 * @example
 * ```tsx
 * <ServiceWorkerRegistration consentKey="mandala-offline-consent" />
 * ```
 */
export function ServiceWorkerRegistration(props: ServiceWorkerRegistrationProps) {
  useOfflineServiceWorker(props)

  return null
}
