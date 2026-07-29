import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

import { getNpmClientByServerId } from '@/lib/nginx-proxy-manager-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/nginx/proxy-hosts
 * Получить список всех proxy hosts
 *
 * Query параметры:
 * - serverId: string (опционально) - ID сервера
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const serverId = searchParams.get('serverId')

    const { client, hasNpm } = await getNpmClientByServerId(serverId)

    if (!hasNpm) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        hasNpm: false,
        message: 'NPM не настроен для этого сервера',
      })
    }

    const hosts = await client.getProxyHosts()
    return NextResponse.json({
      success: true,
      data: hosts,
      count: hosts.length,
      hasNpm: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Схема валидации для создания proxy host
 */
const CreateProxyHostSchema = z
  .object({
    domain_names: z.array(z.string().min(1)).min(1, 'Укажите хотя бы один домен'),
    forward_host: z.string().min(1, 'Укажите хост для проксирования'),
    forward_port: z.number().int().positive('Укажите корректный порт'),
    forward_scheme: z.enum(['http', 'https']).default('http'),
    // SSL настройки
    certificate_id: z.union([z.number(), z.literal('new')]).optional(),
    ssl_forced: z.boolean().default(false),
    hsts_enabled: z.boolean().default(false),
    hsts_subdomains: z.boolean().default(false),
    // Дополнительные настройки
    caching_enabled: z.boolean().default(false),
    block_exploits: z.boolean().default(true),
    allow_websocket_upgrade: z.boolean().default(true),
    http2_support: z.boolean().default(true),
    // Advanced config (опционально)
    advanced_config: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .strip()

/**
 * POST /api/nginx/proxy-hosts
 * Создать новый proxy host
 *
 * Query параметры:
 * - serverId: string (опционально) - ID сервера
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const serverId = searchParams.get('serverId')

    const { client, hasNpm } = await getNpmClientByServerId(serverId)

    if (!hasNpm) {
      return NextResponse.json(
        {
          success: false,
          error: 'NPM не настроен для этого сервера',
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = CreateProxyHostSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const host = await client.createProxyHost(parsed.data)

    return NextResponse.json(
      {
        success: true,
        data: host,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating proxy host:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
