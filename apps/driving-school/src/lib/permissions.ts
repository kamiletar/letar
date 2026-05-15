/**
 * Конфигурация ролей и прав доступа для организаций (школ)
 *
 * Используем Better Auth organizations plugin с динамическими ролями.
 * Этот файл определяет:
 * - Кастомные ресурсы и действия (statement)
 * - Роли с их правами доступа
 *
 * @see https://www.better-auth.com/docs/plugins/organization
 */
import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements, ownerAc } from 'better-auth/plugins/organization/access'

// ============================================================================
// ОПРЕДЕЛЕНИЕ РЕСУРСОВ И ДЕЙСТВИЙ
// ============================================================================

/**
 * Кастомные ресурсы для автошколы
 *
 * Каждый ресурс имеет набор действий, которые можно выполнять.
 * Роли определяют, какие действия доступны для каждого ресурса.
 */
export const statement = {
  // Стандартные ресурсы Better Auth (organization, member, invitation)
  ...defaultStatements,

  // === Учебный процесс ===

  /** Практические занятия */
  lesson: ['create', 'update', 'delete', 'view', 'assign'],

  /** Теоретические занятия */
  theory: ['create', 'update', 'delete', 'view', 'attend', 'grade'],

  /** Экзамены */
  exam: ['create', 'update', 'delete', 'view', 'grade', 'enroll'],

  /** Курсы обучения */
  course: ['create', 'update', 'delete', 'view'],

  // === Управление людьми ===

  /** Ученики */
  student: ['create', 'update', 'delete', 'view', 'enroll', 'progress'],

  /** Инструкторы */
  instructor: ['view', 'assign', 'manage'],

  // === Инфраструктура ===

  /** Филиалы (locations) */
  location: ['create', 'update', 'delete', 'view', 'assign'],

  /** Учебные группы */
  studyGroup: ['create', 'update', 'delete', 'view', 'manage'],

  // === Финансы и отчётность ===

  /** Финансы школы */
  finance: ['view', 'manage'],

  /** Отчёты */
  report: ['view', 'export'],

  // === Коммуникации ===

  /** Чаты */
  chat: ['create', 'view', 'manage'],

  /** Уведомления */
  notification: ['create', 'view'],
} as const

/**
 * Access Control инстанс
 *
 * Используется для создания ролей и проверки прав
 */
export const ac = createAccessControl(statement)

// ============================================================================
// ОПРЕДЕЛЕНИЕ РОЛЕЙ
// ============================================================================

/**
 * Роль: OWNER (Владелец школы)
 *
 * Полный доступ ко всем функциям школы.
 * Маппинг: SchoolMemberRole.ADMIN → owner
 */
export const owner = ac.newRole({
  // Стандартные права владельца
  ...ownerAc.statements,

  // Учебный процесс — полный доступ
  lesson: ['create', 'update', 'delete', 'view', 'assign'],
  theory: ['create', 'update', 'delete', 'view', 'attend', 'grade'],
  exam: ['create', 'update', 'delete', 'view', 'grade', 'enroll'],
  course: ['create', 'update', 'delete', 'view'],

  // Управление людьми — полный доступ
  student: ['create', 'update', 'delete', 'view', 'enroll', 'progress'],
  instructor: ['view', 'assign', 'manage'],

  // Инфраструктура — полный доступ
  location: ['create', 'update', 'delete', 'view', 'assign'],
  studyGroup: ['create', 'update', 'delete', 'view', 'manage'],

  // Финансы — полный доступ
  finance: ['view', 'manage'],
  report: ['view', 'export'],

  // Коммуникации — полный доступ
  chat: ['create', 'view', 'manage'],
  notification: ['create', 'view'],
})

/**
 * Роль: SUPER_MANAGER (Супер-менеджер)
 *
 * Доступ ко всем филиалам без явной привязки.
 * Может приглашать всех кроме owner.
 * Маппинг: SchoolMemberRole.SUPER_MANAGER → super_manager
 */
export const super_manager = ac.newRole({
  // Права на организацию (без delete)
  organization: ['update'],

  // Управление членами и приглашениями
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],

  // Учебный процесс — полный доступ
  lesson: ['create', 'update', 'delete', 'view', 'assign'],
  theory: ['create', 'update', 'delete', 'view', 'attend', 'grade'],
  exam: ['create', 'update', 'delete', 'view', 'grade', 'enroll'],
  course: ['create', 'update', 'delete', 'view'],

  // Управление людьми — полный доступ
  student: ['create', 'update', 'delete', 'view', 'enroll', 'progress'],
  instructor: ['view', 'assign', 'manage'],

  // Инфраструктура — полный доступ (ко всем филиалам)
  location: ['create', 'update', 'delete', 'view', 'assign'],
  studyGroup: ['create', 'update', 'delete', 'view', 'manage'],

  // Финансы — полный доступ
  finance: ['view', 'manage'],
  report: ['view', 'export'],

  // Коммуникации
  chat: ['create', 'view', 'manage'],
  notification: ['create', 'view'],
})

/**
 * Роль: MANAGER (Менеджер)
 *
 * Управление в пределах назначенных филиалов.
 * Не может приглашать менеджеров и выше.
 * Маппинг: SchoolMemberRole.MANAGER → manager
 */
export const manager = ac.newRole({
  // Управление членами (ограниченное)
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],

  // Учебный процесс — управление
  lesson: ['create', 'update', 'view', 'assign'],
  theory: ['create', 'update', 'view', 'attend'],
  exam: ['create', 'update', 'view', 'enroll'],
  course: ['view'],

  // Управление людьми
  student: ['create', 'update', 'view', 'enroll', 'progress'],
  instructor: ['view', 'assign'],

  // Инфраструктура — только просмотр и назначение (в пределах своих филиалов)
  location: ['view', 'assign'],
  studyGroup: ['create', 'update', 'view', 'manage'],

  // Финансы — только просмотр
  finance: ['view'],
  report: ['view'],

  // Коммуникации
  chat: ['create', 'view'],
  notification: ['create', 'view'],
})

/**
 * Роль: INSTRUCTOR (Инструктор по вождению)
 *
 * Проведение практических занятий.
 * Маппинг: SchoolMemberRole.INSTRUCTOR → instructor
 */
export const instructor = ac.newRole({
  // Практические занятия — управление своими
  lesson: ['create', 'update', 'view'],

  // Экзамены — оценивание
  exam: ['view', 'grade'],

  // Ученики — просмотр и прогресс
  student: ['view', 'progress'],

  // Инфраструктура — только просмотр
  location: ['view'],
  studyGroup: ['view'],

  // Коммуникации
  chat: ['view'],
  notification: ['view'],
})

/**
 * Роль: THEORY_INSTRUCTOR (Преподаватель теории)
 *
 * Проведение теоретических занятий.
 * Маппинг: SchoolMemberRole.THEORY_INSTRUCTOR → theory_instructor
 */
export const theory_instructor = ac.newRole({
  // Теоретические занятия — полное управление
  theory: ['create', 'update', 'view', 'attend', 'grade'],

  // Экзамены — просмотр и оценивание теоретических
  exam: ['view', 'grade'],

  // Ученики — просмотр
  student: ['view'],

  // Учебные группы — управление своими
  studyGroup: ['view', 'manage'],

  // Коммуникации
  chat: ['view'],
  notification: ['view'],
})

/**
 * Роль: MEMBER (Ученик)
 *
 * Базовый доступ: просмотр расписания, своего прогресса.
 * Маппинг: SchoolMemberRole.STUDENT → member
 */
export const member = ac.newRole({
  // Учебный процесс — только просмотр
  lesson: ['view'],
  theory: ['view', 'attend'],
  exam: ['view', 'enroll'],
  course: ['view'],

  // Свой прогресс
  student: ['view'],

  // Коммуникации
  chat: ['view'],
  notification: ['view'],
})

// ============================================================================
// ЭКСПОРТ РОЛЕЙ
// ============================================================================

/**
 * Все роли для organization plugin
 *
 * Передаются в конфигурацию плагина:
 * ```ts
 * organization({ ac, roles })
 * ```
 */
export const roles = {
  owner,
  super_manager,
  manager,
  instructor,
  theory_instructor,
  member,
}

// ============================================================================
// МАППИНГ РОЛЕЙ
// ============================================================================

/**
 * Маппинг старых ролей SchoolMemberRole на новые
 *
 * Используется при миграции данных.
 */
export const roleMapping = {
  ADMIN: 'owner',
  SUPER_MANAGER: 'super_manager',
  MANAGER: 'manager',
  INSTRUCTOR: 'instructor',
  THEORY_INSTRUCTOR: 'theory_instructor',
  STUDENT: 'member',
} as const

/**
 * Обратный маппинг (для UI и отображения)
 */
export const roleMappingReverse = {
  owner: 'ADMIN',
  super_manager: 'SUPER_MANAGER',
  manager: 'MANAGER',
  instructor: 'INSTRUCTOR',
  theory_instructor: 'THEORY_INSTRUCTOR',
  member: 'STUDENT',
} as const

/**
 * Названия ролей для UI
 */
export const roleLabels = {
  owner: 'Администратор',
  super_manager: 'Супер-менеджер',
  manager: 'Менеджер',
  instructor: 'Инструктор',
  theory_instructor: 'Преподаватель теории',
  member: 'Ученик',
} as const

/**
 * Цвета ролей для UI (Chakra colorPalette)
 */
export const roleColors = {
  owner: 'red',
  super_manager: 'orange',
  manager: 'yellow',
  instructor: 'blue',
  theory_instructor: 'purple',
  member: 'green',
} as const

/**
 * Иерархия ролей (для проверки "кто кого может приглашать")
 *
 * Меньшее значение = выше в иерархии
 */
export const roleHierarchy = {
  owner: 0,
  super_manager: 1,
  manager: 2,
  instructor: 3,
  theory_instructor: 3,
  member: 4,
} as const

/**
 * Проверяет, может ли роль A управлять ролью B
 *
 * @example
 * canManageRole('owner', 'manager') // true
 * canManageRole('manager', 'owner') // false
 * canManageRole('manager', 'instructor') // true
 */
export function canManageRole(
  managerRole: keyof typeof roleHierarchy,
  targetRole: keyof typeof roleHierarchy
): boolean {
  return roleHierarchy[managerRole] < roleHierarchy[targetRole]
}

/**
 * Получить роли, которые может приглашать данная роль
 */
export function getInvitableRoles(role: keyof typeof roleHierarchy): (keyof typeof roleHierarchy)[] {
  const hierarchy = roleHierarchy[role]
  return Object.entries(roleHierarchy)
    .filter(([_, level]) => level > hierarchy)
    .map(([roleName]) => roleName as keyof typeof roleHierarchy)
}
