#!/usr/bin/env node
/**
 * Codemod: убирает запрещённый Chakra `<Icon as={X} .../>` — заменяет на прямой рендер
 * react-icons компонента. Рецепт — .claude/docs/chakra-icon-as-prop-cleanup-pattern.md.
 *
 * Использование:
 *   node scripts/codemods/chakra-icon-as-cleanup.mjs "apps/<app>/**\/*.tsx"
 *
 * Обрабатывает только однозначные случаи (боксы 1-4 из рецепта). Всё, что не укладывается
 * в правила без угадывания (сложные тернарники, неизвестные style-пропы на Icon, `as=` на
 * компонентах кроме Icon), оставляет как есть и печатает предупреждение — доработка руками.
 */

import { Project, Node, SyntaxKind } from 'ts-morph'
import { existsSync, globSync } from 'node:fs'
import path from 'node:path'

const patterns = process.argv.slice(2)
if (patterns.length === 0) {
  console.error('Использование: node chakra-icon-as-cleanup.mjs <glob> [<glob> ...]')
  process.exit(1)
}

// react-icons SVG принимает size/color/title/className/style/fill/stroke и обычные DOM-атрибуты.
// Chakra shorthand-пропы (zIndex, w, m*, p*, bg, position...) он не понимает — такие случаи
// требуют ручного решения (как в ResumeOverlay.tsx: zIndex → style + добавленный вручную
// position: relative), поэтому не трогаем узел целиком.
const PASSTHROUGH_ATTR_RE = /^(className|title|onClick|onMouseEnter|onMouseLeave|onFocus|onBlur|tabIndex|role|id|fill|stroke|strokeWidth|data-|aria-)/

// Пути вроде apps/mandala/src/app/[locale]/(main)/offline/page.tsx — легальные каталоги Next.js,
// но [...]/(...) — glob-метасимволы. Существующий на диске путь берём буквально, не через glob,
// иначе он молча не находится (globSync трактует скобки как паттерн, не как часть имени).
const files = [...new Set(patterns.flatMap((p) => existsSync(p) ? [p] : globSync(p, { cwd: process.cwd() })))]
  .map((p) => path.resolve(process.cwd(), p))

if (files.length === 0) {
  console.error('Не найдено файлов по переданным glob-паттернам')
  process.exit(1)
}

const project = new Project({
  compilerOptions: { jsx: 'react-jsx' },
  skipAddingFilesFromTsConfig: true,
})

let totalConverted = 0
let totalSkipped = 0
const filesWithLeftovers = []
const scopeVarCache = new WeakMap()

for (const filePath of files) {
  const sourceFile = project.addSourceFileAtPath(filePath)
  const { converted, skipped } = processFile(sourceFile)
  totalConverted += converted
  totalSkipped += skipped

  if (converted > 0) {
    sourceFile.saveSync()
  }

  const remaining = countIconAsUsages(sourceFile)
  if (remaining > 0) {
    filesWithLeftovers.push({ file: path.relative(process.cwd(), filePath), remaining })
  }

  project.removeSourceFile(sourceFile)
}

console.log(`\nГотово: сконвертировано ${totalConverted}, пропущено ${totalSkipped}`)
if (filesWithLeftovers.length > 0) {
  console.log('\nФайлы с оставшимися Icon as= (нужна ручная доработка):')
  for (const { file, remaining } of filesWithLeftovers) {
    console.log(`  ${file} — ${remaining}`)
  }
} else {
  console.log('Неконвертированных Icon as= не осталось.')
}

function countIconAsUsages(sourceFile) {
  let count = 0
  sourceFile.forEachDescendant((node) => {
    if (isIconElement(node)) count++
  })
  return count
}

function isIconElement(node) {
  if (Node.isJsxSelfClosingElement(node)) {
    return node.getTagNameNode().getText() === 'Icon'
  }
  if (Node.isJsxElement(node)) {
    return node.getOpeningElement().getTagNameNode().getText() === 'Icon'
  }
  return false
}

function processFile(sourceFile) {
  let converted = 0
  let skipped = 0
  const relPath = path.relative(process.cwd(), sourceFile.getFilePath())

  // Собираем узлы заранее — трансформации меняют дерево, повторный обход после каждой правки дорог.
  const iconNodes = []
  sourceFile.forEachDescendant((node) => {
    if (isIconElement(node)) iconNodes.push(node)
  })

  for (const node of iconNodes) {
    const warn = (msg) => {
      console.log(`  [skip] ${relPath}:${node.getStartLineNumber()} — ${msg}`)
      skipped++
    }

    if (Node.isJsxElement(node) && node.getJsxChildren().some((c) => !isBlankJsxText(c))) {
      warn('у Icon есть дочерние элементы — не однозначный случай')
      continue
    }

    const opening = Node.isJsxSelfClosingElement(node) ? node : node.getOpeningElement()
    const attrs = opening.getAttributes()

    const known = { as: null, boxSize: null, color: null, mr: null, ml: null, mt: null, mb: null }
    const passthroughTexts = []
    let unsupported = null

    for (const attr of attrs) {
      if (!Node.isJsxAttribute(attr)) {
        unsupported = 'спред-атрибут ({...props})'
        break
      }
      const name = attr.getNameNode().getText()
      if (name in known) {
        known[name] = attr
        continue
      }
      if (PASSTHROUGH_ATTR_RE.test(name)) {
        passthroughTexts.push(attr.getText())
        continue
      }
      unsupported = `непонятный проп \`${name}\` (не react-icons-совместимый — нужна ручная проверка)`
      break
    }

    if (unsupported) {
      warn(unsupported)
      continue
    }
    if (!known.as) {
      warn('нет атрибута as= — не Icon-иконка в обычном смысле')
      continue
    }

    const asInit = known.as.getInitializer()
    if (!asInit || !Node.isJsxExpression(asInit) || !asInit.getExpression()) {
      warn('as= без выражения')
      continue
    }
    const asExpr = asInit.getExpression()

    // size из boxSize (Chakra spacing scale ×4 = px). Без boxSize= пропускаем: в реальных
    // примерах человек выбирал размер (16/20/24) по контексту окружающей кнопки, а не по
    // единому дефолту — угадать нельзя, см. chakra-icon-as-prop-cleanup-pattern.md.
    if (!known.boxSize) {
      warn('нет boxSize= — размер иконки не определить однозначно, нужно решение по контексту')
      continue
    }
    const boxInit = known.boxSize.getInitializer()
    const numText = extractNumericLiteralText(boxInit)
    if (numText === null) {
      warn('boxSize= не числовой литерал — не однозначно')
      continue
    }
    const sizeAttrText = ` size={${Number(numText) * 4}}`

    // color из Chakra-токена → CSS custom property
    let colorAttrText = ''
    if (known.color) {
      const colorInit = known.color.getInitializer()
      const tokenText = extractStringLiteralText(colorInit)
      if (tokenText === null) {
        warn('color= не строковый литерал — не однозначно')
        continue
      }
      colorAttrText = ` color="var(--chakra-colors-${tokenToKebab(tokenText)})"`
    }

    // mr/ml/mt/mb → инлайн style (react-icons SVG не понимает Chakra spacing-пропы)
    const MARGIN_PROP_TO_CSS = { mr: 'marginRight', ml: 'marginLeft', mt: 'marginTop', mb: 'marginBottom' }
    let styleAttrText = ''
    if (known.mr || known.ml || known.mt || known.mb) {
      const styleParts = []
      let marginBail = false
      for (const [propName, cssName] of Object.entries(MARGIN_PROP_TO_CSS)) {
        if (!known[propName]) continue
        const num = extractNumericLiteralText(known[propName].getInitializer())
        if (num === null) {
          warn(`${propName}= не числовой литерал — не однозначно`)
          marginBail = true
          break
        }
        styleParts.push(`${cssName}: ${Number(num) * 4}`)
      }
      if (marginBail) continue
      styleAttrText = ` style={{ ${styleParts.join(', ')} }}`
    }

    const tagResult = resolveIconTag(asExpr, node, warn)
    if (tagResult === null) {
      // resolveIconTag уже вызвал warn()
      continue
    }

    const extraAttrs = [sizeAttrText, colorAttrText, styleAttrText, ...passthroughTexts.map((t) => ` ${t}`)]
      .join('')

    const newJsxText = tagResult.kind === 'simple'
      ? `<${tagResult.tag}${extraAttrs} />`
      : `{${tagResult.condText} ? <${tagResult.trueTag}${extraAttrs} /> : <${tagResult.falseTag}${extraAttrs} />}`

    node.replaceWithText(newJsxText)
    converted++
  }

  if (converted > 0) {
    removeUnusedIconImport(sourceFile)
  }

  return { converted, skipped }
}

function isBlankJsxText(child) {
  return Node.isJsxText(child) && child.getText().trim() === ''
}

function extractNumericLiteralText(initializer) {
  if (!initializer) return null
  if (Node.isNumericLiteral(initializer)) return initializer.getText()
  if (Node.isJsxExpression(initializer)) {
    const expr = initializer.getExpression()
    if (expr && Node.isNumericLiteral(expr)) return expr.getText()
  }
  return null
}

function extractStringLiteralText(initializer) {
  if (!initializer) return null
  if (Node.isStringLiteral(initializer)) return initializer.getLiteralValue()
  if (Node.isJsxExpression(initializer)) {
    const expr = initializer.getExpression()
    if (expr && Node.isStringLiteral(expr)) return expr.getLiteralValue()
  }
  return null
}

function tokenToKebab(token) {
  return token
    .split('.')
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
    .join('-')
}

/**
 * Резолвит выражение as= в имя JSX-тега. Поддерживает Identifier, PropertyAccessExpression
 * и ConditionalExpression с такими же ветками. Всё остальное (вызовы, вложенные тернарники,
 * логические операторы) — не однозначный случай, возвращает null и печатает warn через
 * переданный колбэк.
 */
function resolveIconTag(expr, jsxNode, warn) {
  if (Node.isConditionalExpression(expr)) {
    const trueTag = resolveSimpleTag(expr.getWhenTrue(), jsxNode, warn)
    if (trueTag === null) return null
    const falseTag = resolveSimpleTag(expr.getWhenFalse(), jsxNode, warn)
    if (falseTag === null) return null
    return { kind: 'ternary', condText: expr.getCondition().getText(), trueTag, falseTag }
  }
  const tag = resolveSimpleTag(expr, jsxNode, warn)
  if (tag === null) return null
  return { kind: 'simple', tag }
}

function resolveSimpleTag(expr, jsxNode, warn) {
  if (Node.isIdentifier(expr)) {
    const name = expr.getText()
    if (/^[A-Z]/.test(name)) return name
    return ensureIconVariable(name, expr.getText(), jsxNode, warn)
  }
  if (Node.isPropertyAccessExpression(expr)) {
    const propName = expr.getName()
    return ensureIconVariable(propName, expr.getText(), jsxNode, warn)
  }
  warn(`as= (или ветка тернарника) не Identifier/PropertyAccessExpression: \`${expr.getText()}\``)
  return null
}

/**
 * Заводит `const <Var> = <exprText>` перед ближайшим statement в блоке, который содержит
 * использование иконки (см. пример UpNextOverlay.tsx — переменная вставляется не в начало
 * функции, а прямо перед return, после того как contentStyles уже вычислен).
 * Повторное использование того же выражения в одном блоке переиспользует уже заведённую переменную.
 */
function ensureIconVariable(baseName, exprText, jsxNode, warn) {
  const block = jsxNode.getFirstAncestor((a) => Node.isBlock(a) || Node.isSourceFile(a))
  if (!block || Node.isSourceFile(block)) {
    warn(`не нашёл enclosing block для переменной иконки \`${exprText}\` — не однозначно`)
    return null
  }

  let cache = scopeVarCache.get(block)
  if (!cache) {
    cache = new Map()
    scopeVarCache.set(block, cache)
  }
  if (cache.has(exprText)) {
    return cache.get(exprText)
  }

  const targetStatement = jsxNode.getFirstAncestor((a) => a.getParent() === block)
  if (!targetStatement) {
    warn(`не нашёл statement для вставки переменной иконки \`${exprText}\` — не однозначно`)
    return null
  }

  const varName = uniqueVarName(nameForIconVar(baseName), block)
  block.insertStatements(targetStatement.getChildIndex(), `const ${varName} = ${exprText}`)
  cache.set(exprText, varName)
  return varName
}

function nameForIconVar(rawName) {
  if (rawName.toLowerCase() === 'icon') return 'IconComponent'
  const capitalized = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  return /icon$/i.test(capitalized) ? capitalized : `${capitalized}Icon`
}

function uniqueVarName(base, block) {
  const blockText = block.getText()
  if (!new RegExp(`\\b${base}\\b`).test(blockText)) return base
  let i = 2
  while (new RegExp(`\\b${base}${i}\\b`).test(blockText)) i++
  return `${base}${i}`
}

function removeUnusedIconImport(sourceFile) {
  const stillUsed = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    .some((n) => n.getTagNameNode().getText() === 'Icon')
    || sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
      .some((n) => n.getTagNameNode().getText() === 'Icon')
    || sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
      .some((n) => n.getText() === 'Icon' && !Node.isImportSpecifier(n.getParent()))
  if (stillUsed) return

  for (const imp of sourceFile.getImportDeclarations()) {
    const named = imp.getNamedImports()
    const iconSpecifier = named.find((s) => s.getName() === 'Icon' && !s.getAliasNode())
    if (iconSpecifier) {
      iconSpecifier.remove()
      if (imp.getNamedImports().length === 0 && !imp.getDefaultImport() && !imp.getNamespaceImport()) {
        imp.remove()
      }
    }
  }
}
