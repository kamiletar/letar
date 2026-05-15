export {
  acceptSchoolInvitation,
  cancelSchoolInvitation,
  // Создание и управление школой
  createSchool,
  // Приглашения в школу
  createSchoolInvitation,
  declineSchoolInvitation,
  getSchoolById,
  getSchoolMembers,
  getSchoolRole,
  getUserSchools,
  // Проверка прав
  isSchoolAdmin,
  isSchoolMember,
  // Управление членами
  removeMemberFromSchool,
  updateMemberRole,
  updateSchool,
  type AcceptInvitationResult,
  type CreateSchoolResult,
  type GetMembersResult,
  type GetSchoolResult,
  type GetSchoolsResult,
  type InvitationResult,
  type MemberOperationResult,
  type SchoolData,
  type SchoolInvitationData,
  type SchoolMembershipData,
  // Типы
  type SchoolRepository,
  type UpdateSchoolResult,
} from './school-service'
