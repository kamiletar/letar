import { createId } from '@paralleldrive/cuid2'
import Redis from 'ioredis'
import { config } from './config.ts'

const redis = new Redis(config.redisUrl)

const TTL_SEC = 15 * 60 // 15 минут

/** Создаёт одноразовый upload-токен для appId, сохраняет в Redis */
export async function createUploadToken(appId: string, videoId: string, webhookUrl: string): Promise<string> {
  const token = createId()
  await redis.setex(`upload_token:${token}`, TTL_SEC, JSON.stringify({ appId, videoId, webhookUrl }))
  return token
}

/** Проверяет токен и возвращает payload (одноразово — удаляет после чтения) */
export async function consumeUploadToken(
  token: string,
): Promise<{ appId: string; videoId: string; webhookUrl: string } | null> {
  const key = `upload_token:${token}`
  const raw = await redis.get(key)
  if (!raw) { return null }
  await redis.del(key)
  return JSON.parse(raw) as { appId: string; videoId: string; webhookUrl: string }
}
