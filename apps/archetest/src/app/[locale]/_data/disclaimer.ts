/**
 * Текст информированного дисклеймера/согласия (этап 5.6.3) — единый источник
 * для полного квиза и экспресса. Позиционирование: инструмент самопознания,
 * НЕ диагностика, НЕ медизделие (согласовано с РКН-записью — спецкатегория
 * «здоровье» не заявлена, см. docs/rkn-info-letter.md).
 */

/** Ключ localStorage: пользователь ознакомился с дисклеймером (квиз и экспресс общий) */
export const DISCLAIMER_CONSENT_KEY = 'quiz_disclaimer_accepted'

/**
 * Короткая сводка для интро-экрана (этап: UX-исправление 2026-07-29) — полный текст
 * ниже переехал в диалог по ссылке «Подробнее», на экране всегда виден только один
 * абзац + чекбокс в липкой панели.
 */
export const DISCLAIMER_SUMMARY_RU = 'Это инструмент самопознания, не диагностика и не медицинское заключение.'
export const DISCLAIMER_SUMMARY_EN = 'This is a self-discovery tool, not a diagnosis or a medical opinion.'

/** Полный текст дисклеймера (из disclaimer.md от психолога) */
export const DISCLAIMER_RU =
  `Данный тест является инструментом самопознания и не предназначен для постановки медицинских или психологических диагнозов. Результаты теста носят ориентировочный характер и отражают выраженность определённых личностных черт, а не наличие психического расстройства.

Тест не заменяет консультацию квалифицированного специалиста — психолога, психотерапевта или психиатра. Если результаты вызывают у вас беспокойство или вы испытываете трудности в повседневной жизни, рекомендуется обратиться к специалисту для профессиональной оценки.

Результаты теста не могут использоваться в качестве основания для принятия медицинских, юридических, кадровых или иных решений, затрагивающих права и интересы человека.

Каждый человек уникален. Любой тип личности имеет свои сильные стороны и зоны роста. Высокий балл по какой-либо шкале не означает «проблему» — он указывает на выраженную черту, которая может быть как ресурсом, так и источником трудностей в зависимости от контекста.`

export const DISCLAIMER_EN =
  `This test is a self-discovery tool and is not intended for medical or psychological diagnosis. Results are indicative and reflect the expression of certain personality traits, not the presence of a mental disorder.

The test does not replace consultation with a qualified specialist — psychologist, psychotherapist, or psychiatrist. If results cause concern or you experience difficulties in everyday life, professional evaluation is recommended.

Test results cannot be used as a basis for medical, legal, employment, or other decisions affecting a person's rights and interests.

Every person is unique. Every personality type has strengths and growth areas. A high score on any scale does not mean a "problem" — it indicates a pronounced trait that can be both a resource and a source of difficulty depending on context.`
