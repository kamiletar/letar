import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { describe, expect, it } from 'vitest'
import { pickTaskPrefix } from './task-prefix'

function withPrefix(tree: ReturnType<typeof createTreeWithEmptyWorkspace>, dir: string, prefix: string) {
  tree.write(`${dir}/tasks/tasks.json`, JSON.stringify({ project: dir, prefix, frozen: [] }))
}

describe('pickTaskPrefix', () => {
  it('берёт инициалы слов имени', () => {
    const tree = createTreeWithEmptyWorkspace()
    expect(pickTaskPrefix(tree, 'my-cool-app')).toBe('MCA')
  })

  it('для односложного имени берёт первые буквы', () => {
    const tree = createTreeWithEmptyWorkspace()
    expect(pickTaskPrefix(tree, 'notebook')).toBe('NO')
  })

  it('пропускает занятые префиксы в apps/*, libs/* и корне', () => {
    const tree = createTreeWithEmptyWorkspace()
    withPrefix(tree, 'apps/a', 'NO')
    withPrefix(tree, 'libs/b', 'NOT')
    withPrefix(tree, '.', 'NOTE')
    expect(pickTaskPrefix(tree, 'notebook')).toBe('NOE')
  })

  it('падает, когда подобрать нечего', () => {
    const tree = createTreeWithEmptyWorkspace()
    expect(() => pickTaskPrefix(tree, '1')).toThrow('Не удалось подобрать префикс')
  })
})
