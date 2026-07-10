import { codeToHtml } from 'shiki'

type Props = {
  code: string
  language?: string
}

const SUPPORTED_LANGS = new Set([
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'python',
  'rust',
  'go',
  'bash',
  'shell',
  'sh',
  'zsh',
  'json',
  'yaml',
  'toml',
  'html',
  'css',
  'scss',
  'sql',
  'prisma',
  'graphql',
  'markdown',
  'mdx',
  'dockerfile',
  'nginx',
])

/**
 * Безопасность: контент приходит из Keystatic (git-based, только admin-контент).
 * shiki экранирует все HTML-сущности в коде и генерирует только <span> теги со стилями.
 * XSS через dangerouslySetInnerHTML невозможен при таком источнике и обработчике.
 */
function SafeHighlightedCode({ html }: { html: string }) {
  return (
    <div
      style={{ marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'auto', fontSize: '0.875rem' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export async function CodeHighlighter({ code, language }: Props) {
  const lang = language && SUPPORTED_LANGS.has(language) ? language : 'text'

  let html: string
  try {
    html = await codeToHtml(code, {
      lang: lang as Parameters<typeof codeToHtml>[1]['lang'],
      themes: {
        dark: 'github-dark',
        light: 'github-light',
      },
      defaultColor: false,
    })
  } catch {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    html = `<pre style="padding:1rem;background:#24292e;color:#e1e4e8;border-radius:0.5rem"><code>${escaped}</code></pre>`
  }

  return <SafeHighlightedCode html={html} />
}
