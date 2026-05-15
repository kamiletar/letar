import type { OAuthProvider } from '../oauth-buttons'

/**
 * Цвета для провайдеров (Chakra UI colorPalette)
 */
export const providerColors: Record<OAuthProvider | 'credential', string> = {
  google: 'red',
  yandex: 'red',
  github: 'gray',
  telegram: 'blue',
  vk: 'blue',
  facebook: 'blue',
  credential: 'gray',
}

/**
 * Названия провайдеров для отображения
 */
export const providerNames: Record<OAuthProvider | 'credential', string> = {
  google: 'Google',
  yandex: 'Яндекс',
  github: 'GitHub',
  telegram: 'Telegram',
  vk: 'ВКонтакте',
  facebook: 'Facebook',
  credential: 'Email + пароль',
}
