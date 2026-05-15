/** Результат публикации в соцсеть */
export interface PublishResult {
  success: boolean
  /** ID поста в соцсети */
  externalId?: string
  /** URL поста в соцсети */
  externalUrl?: string
  /** Текст ошибки */
  error?: string
}

/** Данные блог-поста для публикации */
export interface BlogPostData {
  slug: string
  title: string
  description: string
  tags: string[]
  /** Полный URL на сайте (https://kami.letar.best/ru/blog/...) */
  url: string
}

/** Конфигурация Telegram платформы (хранится в SocialPlatform.config) */
export interface TelegramConfig {
  /** Токен бота */
  botToken: string
  /** ID чата/канала (например @channel_name или числовой ID) */
  chatId: string
  /** URL прокси для обхода блокировки (tg-proxy.letar.best) */
  proxyUrl?: string
}

/** Конфигурация VK платформы */
export interface VKConfig {
  /** Токен доступа (user или group) */
  accessToken: string
  /** ID группы (отрицательный) или пользователя */
  ownerId: string
}

/** Конфигурация Facebook платформы */
export interface FacebookConfig {
  /** Page Access Token (долгоживущий) */
  pageAccessToken: string
  /** ID страницы Facebook */
  pageId: string
  /** URL прокси для обхода блокировки (fb-proxy.letar.best) */
  proxyUrl?: string
}
