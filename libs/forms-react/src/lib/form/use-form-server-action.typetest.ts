/**
 * Type-тесты для `useFormServerAction.run` — сужение результата до `Exclude<TData, ActionFailure>`.
 *
 * Задача координатора (#1819, тред `form-action-result-extract`): action, обёрнутая в
 * `catchActionFailure`, имеет тип `TData = { id: string } | ActionFailure`. Рантайм-проверка в
 * `run` уже отсекает отказ (бросает `ActionFailureError`, до `onSuccess` не доходит) — этот файл
 * проверяет, что тип `onSuccess`/возврата `run` отражает то же самое, без ручного `as`
 * на стороне вызывающего кода.
 *
 * `run` — generic-метод: чтобы проверить его поведение на конкретном `TData`, нужна
 * instantiation expression (`run<...>`, TS 4.7+) — она специализирует метод под явно указанный
 * тип параметра, и только после этого `Parameters<>`/`ReturnType<>` дают осмысленный тип
 * (у неинстанцированного generic-метода `TData` коллапсирует в его constraint, здесь `unknown`).
 *
 * Запускается через vitest typecheck (не в рантайме).
 */
import type { ActionFailure } from '@letar/forms-core/server-errors'
import { expectTypeOf, test } from 'vitest'
import type { UseFormServerActionResult } from './use-form-server-action'

declare const run: UseFormServerActionResult<unknown>['run']

interface CreatedPost {
  id: string
}

test('TData = T | ActionFailure — onSuccess получает T, отказ из типа исключён', () => {
  const _runWithFailure = run<CreatedPost | ActionFailure>

  type OnSuccess = Parameters<typeof _runWithFailure>[1]
  type Narrowed = Parameters<NonNullable<OnSuccess>>[0]
  expectTypeOf<Narrowed>().toEqualTypeOf<CreatedPost>()
  expectTypeOf<Narrowed>().toHaveProperty('id')

  type ResolvedResult = Awaited<ReturnType<typeof _runWithFailure>>
  expectTypeOf<ResolvedResult>().toEqualTypeOf<CreatedPost>()
  expectTypeOf<ResolvedResult>().not.toEqualTypeOf<CreatedPost | ActionFailure>()
})

test('TData без ActionFailure (старые вызовы, 4 формы входа aboi) — тип не меняется', () => {
  interface SignInResult {
    redirectTo: string
  }
  const _runWithoutFailure = run<SignInResult>

  type OnSuccess = Parameters<typeof _runWithoutFailure>[1]
  type Narrowed = Parameters<NonNullable<OnSuccess>>[0]
  expectTypeOf<Narrowed>().toEqualTypeOf<SignInResult>()

  type ResolvedResult = Awaited<ReturnType<typeof _runWithoutFailure>>
  expectTypeOf<ResolvedResult>().toEqualTypeOf<SignInResult>()
})

test('TData структурно совпадает с ActionFailure целиком (success:false, error, без field) — тоже исключается', () => {
  // Ловушка из письма координатора: `field` в ActionFailure опционален, поэтому объект без него
  // всё ещё СТРУКТУРНО подходит под ActionFailure и должен исключаться из onSuccess/результата —
  // иначе он неотличим от настоящего отказа.
  interface BareFailure {
    success: false
    error: string
  }
  const _runWithBareFailure = run<CreatedPost | BareFailure>

  type OnSuccess = Parameters<typeof _runWithBareFailure>[1]
  type Narrowed = Parameters<NonNullable<OnSuccess>>[0]
  expectTypeOf<Narrowed>().toEqualTypeOf<CreatedPost>()
})

test('TData = ActionFailure целиком — вырожденный случай даёт never, а не саму ActionFailure', () => {
  const _runOnlyFailure = run<ActionFailure>

  type ResolvedResult = Awaited<ReturnType<typeof _runOnlyFailure>>
  expectTypeOf<ResolvedResult>().toBeNever()
})
