function getApiKeys(): Map<string, string> {
  const keys = new Map<string, string>()
  for (const [key, val] of Object.entries(process.env)) {
    if (key.startsWith('MEDIA_KEY_') && val) {
      const appId = key.slice('MEDIA_KEY_'.length).toLowerCase()
      keys.set(appId, val)
    }
  }
  return keys
}

export const config = {
  port: Number(process.env.PORT ?? 3100),
  redisUrl: process.env.REDIS_URL ?? 'redis://redis:6379',
  dataPath: process.env.DATA_PATH ?? '/data',
  apiKeys: getApiKeys(),
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
}

export function validateApiKey(appId: string, key: string): boolean {
  const expected = config.apiKeys.get(appId.toLowerCase())
  if (!expected) return false
  // X-Media-Key: {appId}:{secret}
  const [, secret] = key.split(':')
  return secret === expected
}
