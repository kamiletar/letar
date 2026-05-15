#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createFormMcpServer } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// docs/ lookup order:
// 1. FORM_MCP_DOCS_PATH env — explicitly specified path
// 2. ./docs/ — bundled in the npm package (dist/docs/)
// 3. ../../forms/docs — local monorepo fallback
function resolveDocsPath(): string {
  if (process.env.FORM_MCP_DOCS_PATH) {
    return process.env.FORM_MCP_DOCS_PATH
  }
  // npm package: docs/ is next to cli.js
  const bundledDocs = resolve(join(__dirname, 'docs'))
  if (existsSync(bundledDocs)) {
    return bundledDocs
  }
  // Monorepo: docs/ in forms
  return resolve(join(__dirname, '..', '..', 'forms', 'docs'))
}

const docsPath = resolveDocsPath()

const server = createFormMcpServer({
  docsPath,
  name: '@letar/form-mcp',
  version: '1.0.0',
})

const transport = new StdioServerTransport()
await server.connect(transport)
