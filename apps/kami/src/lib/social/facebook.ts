import type { BlogPostData, FacebookConfig, PublishResult } from './types'

/** Базовый URL Facebook Graph API */
const GRAPH_API = 'https://graph.facebook.com/v21.0'

/**
 * Форматирование поста для Facebook
 */
function formatMessage(post: BlogPostData): string {
  const tags = post.tags.map((t) => `#${t.replace(/\s+/g, '_')}`).join(' ')

  return [`${post.title}\n`, post.description, tags ? `\n${tags}` : ''].filter(Boolean).join('\n')
}

/**
 * Публикация блог-поста на страницу Facebook.
 * Graph API заблокирован из РФ — используем прокси на mail.letar.best.
 */
export async function publishToFacebook(config: FacebookConfig, post: BlogPostData): Promise<PublishResult> {
  const baseUrl = config.proxyUrl ? `https://${config.proxyUrl}` : GRAPH_API
  const url = `${baseUrl}/${config.pageId}/feed`

  try {
    const params = new URLSearchParams({
      message: formatMessage(post),
      link: post.url,
      access_token: config.pageAccessToken,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data = await response.json()

    if (data.error) {
      return {
        success: false,
        error: `Facebook API [${data.error.code}]: ${data.error.message}`,
      }
    }

    // Facebook возвращает id в формате "{pageId}_{postId}"
    const postId = data.id as string | undefined
    const externalUrl = postId ? `https://www.facebook.com/${postId.replace('_', '/posts/')}` : undefined

    return {
      success: true,
      externalId: postId,
      externalUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка Facebook',
    }
  }
}
