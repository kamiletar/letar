import { z } from 'zod/v4'

/**
 * Схема для формы создания Proxy Host
 * Домены вводятся через запятую, парсятся в массив при submit
 */
export const CreateProxyHostFormSchema = z
  .object({
    // Основные поля
    domain_names: z.string().min(1, 'Укажите хотя бы один домен').describe('Домены через запятую'),
    forward_host: z.string().min(1, 'Укажите хост для проксирования'),
    forward_port: z.coerce.number().int().positive('Укажите корректный порт'),
    forward_scheme: z.enum(['http', 'https']).default('http'),

    // SSL настройки
    certificate_id: z.union([z.coerce.number(), z.literal('new')]).optional(),
    ssl_forced: z.boolean().default(true),
    hsts_enabled: z.boolean().default(false),

    // Дополнительные настройки
    caching_enabled: z.boolean().default(false),
    block_exploits: z.boolean().default(true),
    allow_websocket_upgrade: z.boolean().default(true),
    http2_support: z.boolean().default(true),

    // Advanced config (опционально)
    advanced_config: z.string().optional(),
  })
  .strip()

export type CreateProxyHostFormData = z.infer<typeof CreateProxyHostFormSchema>

/**
 * Дефолтные значения для формы
 * Включает оптимальные настройки для production
 */
export const createProxyHostDefaults: CreateProxyHostFormData = {
  domain_names: '',
  forward_host: '',
  forward_port: 3000,
  forward_scheme: 'http',
  certificate_id: 'new', // Автоматический Let's Encrypt
  ssl_forced: true,
  hsts_enabled: false,
  caching_enabled: false,
  block_exploits: true,
  allow_websocket_upgrade: true,
  http2_support: true,
  advanced_config: '',
}

/**
 * Преобразует данные формы в формат для NPM API
 */
export function transformFormDataToApi(data: CreateProxyHostFormData) {
  // Парсим домены из строки через запятую
  const domains = data.domain_names
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)

  return {
    domain_names: domains,
    forward_host: data.forward_host,
    forward_port: data.forward_port,
    forward_scheme: data.forward_scheme,
    certificate_id: data.certificate_id,
    ssl_forced: data.ssl_forced,
    hsts_enabled: data.hsts_enabled,
    caching_enabled: data.caching_enabled,
    block_exploits: data.block_exploits,
    allow_websocket_upgrade: data.allow_websocket_upgrade,
    http2_support: data.http2_support,
    advanced_config: data.advanced_config || undefined,
  }
}
