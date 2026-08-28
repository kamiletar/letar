/**
 * VK ID (OAuth 2.1, id.vk.ru) `getUserInfo` для `socialProviders.vk` Better Auth.
 *
 * Общий код между auth-hub и driving-school (найден дословно продублированным во время
 * миграции на VK ID, 2026-08-27) — POST на `id.vk.com/oauth2/user_info`, парсинг профиля,
 * синтетический email `<user_id>@vk.com` для пользователей без scope email. Дополнительные
 * поля пользователя (driving-school: `birthdate`/`gender`/`phone`) — через `mapAdditionalUserFields`,
 * т.к. их разбор (`parseGender`/`parseBirthdate`) специфичен приложению и переиспользуется им
 * ещё и для Yandex.
 */

/** Сырой профиль из `id.vk.com/oauth2/user_info` */
export interface VkOAuth2Profile {
  user_id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  avatar?: string
  sex?: number
  birthday?: string
}

export interface CreateVkGetUserInfoOptions<TExtra extends Record<string, unknown>> {
  /** `clientId` того же VK ID-приложения, что и в `socialProviders.vk.clientId` */
  clientId: string
  /**
   * Дополнительные поля пользователя (например `birthdate`/`gender`/`phone`) поверх
   * стандартных `name`/`email`/`image`/`emailVerified`. Опущено — только стандартные поля.
   */
  mapAdditionalUserFields?: (profile: VkOAuth2Profile) => TExtra
}

/**
 * Фабрика `getUserInfo` для `socialProviders.vk`. `VkProfile` (тип Better Auth) требует
 * `first_name`/`last_name`/`birthday` непустыми строками — id.vk.com их не всегда отдаёт,
 * дефолтим на пустую строку в возвращаемом `data.user`; сам аккаунт мапится по email выше.
 */
export function createVkGetUserInfo<TExtra extends Record<string, unknown> = Record<never, never>>(
  options: CreateVkGetUserInfoOptions<TExtra>,
) {
  return async (tokens: { accessToken?: string }) => {
    if (!tokens.accessToken) {
      return null
    }

    const response = await fetch('https://id.vk.com/oauth2/user_info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token: tokens.accessToken,
        client_id: options.clientId,
      }).toString(),
    })
    const data = await response.json()
    const profile = data?.user as VkOAuth2Profile | undefined

    if (!profile) {
      return null
    }

    const extra = options.mapAdditionalUserFields?.(profile) ?? ({} as TExtra)

    return {
      user: {
        name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || undefined,
        email: profile.email || `${profile.user_id}@vk.com`,
        image: profile.avatar,
        emailVerified: !!profile.email,
        ...extra,
      },
      data: {
        user: {
          user_id: profile.user_id,
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          email: profile.email,
          avatar: profile.avatar,
          birthday: profile.birthday ?? '',
        },
      },
    }
  }
}
