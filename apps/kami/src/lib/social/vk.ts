import type { BlogPostData, PublishResult, VKConfig } from './types'

/** Базовый URL VK API */
const VK_API = 'https://api.vk.com/method'
const VK_API_VERSION = '5.199'

/**
 * Форматирование поста для VK
 */
function formatMessage(post: BlogPostData): string {
  const tags = post.tags.map((t) => `#${t.replace(/\s+/g, '_')}`).join(' ')

  return [`${post.title}\n`, post.description, `\n🔗 ${post.url}`, tags ? `\n${tags}` : ''].filter(Boolean).join('\n')
}

/**
 * Публикация блог-поста на стену VK группы/пользователя.
 * VK API не заблокирован из РФ — работает напрямую.
 */
export async function publishToVK(config: VKConfig, post: BlogPostData): Promise<PublishResult> {
  const url = `${VK_API}/wall.post`

  try {
    const params = new URLSearchParams({
      owner_id: config.ownerId,
      message: formatMessage(post),
      access_token: config.accessToken,
      v: VK_API_VERSION,
    })

    // from_group=1 только для сообществ (отрицательный owner_id)
    if (config.ownerId.startsWith('-')) {
      params.set('from_group', '1')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data = await response.json()

    if (data.error) {
      return {
        success: false,
        error: `VK API [${data.error.error_code}]: ${data.error.error_msg}`,
      }
    }

    const postId = data.response?.post_id
    // URL поста: https://vk.com/wall{owner_id}_{post_id}
    const externalUrl = postId ? `https://vk.com/wall${config.ownerId}_${postId}` : undefined

    return {
      success: true,
      externalId: String(postId),
      externalUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка VK',
    }
  }
}
