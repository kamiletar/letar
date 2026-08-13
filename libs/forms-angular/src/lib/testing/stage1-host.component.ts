import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldStringComponent } from '../fields/field-string.component'

/**
 * Тестовый host-компонент вынесен в отдельный `.ts`-файл, НЕ в `*.spec.ts` — находка разведки
 * (Фаза 10 `libs/forms/PLAN.md`): Vitest 4 + Vite 8 транформируют файлы теста
 * (`*.spec.ts`/`*.test.ts`) через отдельный от обычного модульного графа путь (похоже на
 * нативный TS type-stripping, не esbuild/oxc), который **не понимает decorator-синтаксис**
 * вовсе — `@Component`/`@Injectable`, объявленные прямо в `*.spec.ts`, валят сборку с
 * `SyntaxError: Invalid or unexpected token` ещё на этапе коллекции тестов (0 обнаруженных
 * тестов, ошибка без стека). Опробованный и подтверждённый воркэраунд: любой Angular-декоратор
 * — только в обычном `.ts`-файле, импортированном в спек, никогда не объявлять `@Component`
 * инлайн в самом `*.spec.ts`.
 */
export const stage1Schema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').meta({
    ui: { title: 'Название', placeholder: 'Введите название' },
  }),
})

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldStringComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-string name="title" />
    </letar-app-form>
  `,
})
export class Stage1HostComponent {
  schema = stage1Schema
  initialValue = { title: '' }
  lastSubmit: Record<string, unknown> | undefined
}
