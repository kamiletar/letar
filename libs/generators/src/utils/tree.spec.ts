import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { assertTargetIsFree, templatesDirFor } from './tree'

describe('assertTargetIsFree', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('молчит, если целевой директории ещё нет', () => {
    expect(() => assertTargetIsFree(tree, 'apps/my-app', 'приложения')).not.toThrow()
  })

  it('падает с понятной ошибкой, если директория занята', () => {
    tree.write('apps/my-app/package.json', '{}')

    expect(() => assertTargetIsFree(tree, 'apps/my-app', 'приложения')).toThrow(
      'apps/my-app уже существует — генератор не перезаписывает существующие приложения'
    )
  })

  it('подставляет вид проекта в текст ошибки', () => {
    tree.write('libs/my-lib/package.json', '{}')

    expect(() => assertTargetIsFree(tree, 'libs/my-lib', 'библиотеки')).toThrow(
      'не перезаписывает существующие библиотеки'
    )
  })
})

describe('templatesDirFor', () => {
  it('указывает на папку files рядом с генератором', () => {
    const dir = templatesDirFor(import.meta.url)

    // import.meta.url этого спека лежит в src/utils — значит ждём src/utils/files
    expect(dir.replaceAll('\\', '/')).toMatch(/src\/utils\/files$/)
  })
})
