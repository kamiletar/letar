/**
 * Redis клиент для dashboard-agent — используется для персистентности deploy-истории
 * (routes/deploy.ts). Graceful degradation через @letar/redis-client: без REDIS_URL или при
 * недоступном Redis деплой продолжает работать чисто в памяти процесса, как раньше.
 */

import { createRedisClient } from '@letar/redis-client'

export const getRedis = createRedisClient({ logPrefix: '[redis]' })
