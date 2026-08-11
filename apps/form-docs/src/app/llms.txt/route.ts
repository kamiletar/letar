import { NextResponse } from 'next/server'

const PRODUCTION_URL = 'https://forms.letar.best'

/**
 * llms.txt (llmstxt.org) — плоский указатель для LLM-краулеров/агентов, не полная документация.
 * Список курируется руками: автогенерация из Fumadocs source API дала бы полное дерево MDX
 * (90+ файлов с RU-дублями), что противоречит цели формата — компактный обзор, не карта сайта
 * (для карты сайта уже есть sitemap.ts).
 */
function buildLlmsTxt(): string {
  const lines = [
    '# @letar/forms',
    '',
    '> Декларативная библиотека форм для React: TanStack Form + Chakra UI v3 + Zod v4. 56+ типов полей, '
    + 'multi-step формы, offline-режим, i18n, ZenStack-интеграция для автогенерации схем из БД.',
    '',
    '## Docs',
    '',
    `- [Getting Started](${PRODUCTION_URL}/docs): обзор, принципы, быстрый пример`,
    `- [Installation](${PRODUCTION_URL}/docs/installation): установка и настройка`,
    `- [Quick Start](${PRODUCTION_URL}/docs/quick-start): первая форма за 5 минут`,
    `- [createForm() Guide](${PRODUCTION_URL}/docs/guides/create-form): app-specific инстанс формы, extraSelects/extraComboboxes/extraFields`,
    `- [Field.* Reference](${PRODUCTION_URL}/docs/fields): полный список полей по категориям`,
    `- [Form Component API](${PRODUCTION_URL}/docs/api/form-component): пропсы Form, FormGroup, FormGroup.List`,
    `- [Hooks API](${PRODUCTION_URL}/docs/api/hooks): useAppForm, useOfflineForm и другие`,
    `- [ZenStack Plugin](${PRODUCTION_URL}/docs/guides/zenstack-plugin): генерация форм из schema.zmodel через @form.* директивы`,
    `- [Offline Mode](${PRODUCTION_URL}/docs/guides/offline): очередь синхронизации, индикаторы статуса`,
    `- [i18n](${PRODUCTION_URL}/docs/guides/i18n): локализация ошибок и опций`,
    `- [MCP Server](${PRODUCTION_URL}/docs/guides/mcp): @letar/form-mcp — доступ к документации и полям для AI-ассистентов`,
    '',
    '## Examples',
    '',
    `- [Interactive Demos](${PRODUCTION_URL}/demo/basic): live-примеры всех полей и паттернов (basic, multi-step, offline, i18n, validation и др.)`,
    '',
    '## Optional',
    '',
    `- [Changelog](https://github.com/kamiletar/letar/blob/main/libs/forms/CHANGELOG.md): история версий`,
    `- npm: [@letar/forms](https://www.npmjs.com/package/@letar/forms), [@letar/form-mcp](https://www.npmjs.com/package/@letar/form-mcp)`,
    '',
  ]
  return lines.join('\n')
}

// Гейта по isProductionDomain (как в robots.ts) намеренно нет: содержимое — указатели на
// публичную документацию открытого npm-пакета, ссылки абсолютные на прод-URL независимо от
// того, с какого домена отдаётся сам файл, скрывать нечего.
export function GET(): NextResponse {
  return new NextResponse(buildLlmsTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
