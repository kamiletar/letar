import type { JobDefinition } from './types'

/**
 * Регистрирует декларацию задачи. Тонкая обёртка ради единообразия и будущей валидации —
 * сейчас просто возвращает вход, но весь реестр приложения обязан идти через неё, а не
 * через голые литералы: единая точка, куда добавлять проверки (уникальность id, валидность
 * cron-выражения) не трогая сайты вызова.
 */
export function defineJob(job: JobDefinition): JobDefinition {
  if (!job.id) {
    throw new Error('defineJob: job.id не может быть пустым')
  }
  if (!/^[a-z0-9-]+$/.test(job.id)) {
    throw new Error(
      `defineJob: job.id "${job.id}" должен быть kebab-case (латиница/цифры/дефис) — используется как имя очереди pg-boss`,
    )
  }
  return job
}
