type ProfileStatus = 'empty' | 'partial' | 'complete'

interface NumerologyProfile {
  lifePathNumber?: number | null
  destinyNumber?: number | null
  soulNumber?: number | null
  personalityNumber?: number | null
  maturityNumber?: number | null
  currentCycle?: string | null
  talents?: string | null
  gifts?: string | null
  purpose?: string | null
  karmicLessons?: string | null
}

interface NeuroPsychProfile {
  behaviorPatterns?: string | null
  cognitiveStyle?: string | null
  learningStyle?: string | null
  defenseMechanisms?: string | null
  emotionalPatterns?: string | null
}

interface EnergyProfile {
  rootChakra?: number | null
  sacralChakra?: number | null
  solarPlexusChakra?: number | null
  heartChakra?: number | null
  throatChakra?: number | null
  thirdEyeChakra?: number | null
  crownChakra?: number | null
  energyBlocks?: string | null
}

interface BodyProfile {
  tensionMap?: string | null
  tensionAreas?: string | null
  psychosomaticIssues?: string | null
  breathingPatterns?: string | null
}

interface StyleProfile {
  colorType?: string | null
  primaryArchetype?: string | null
  secondaryArchetype?: string | null
  selfExpression?: string | null
}

/**
 * Определяет статус заполненности нумерологического профиля
 */
export function getNumerologyStatus(profile: NumerologyProfile | null): ProfileStatus {
  if (!profile) {
    return 'empty'
  }

  const keyFields = [
    profile.lifePathNumber,
    profile.destinyNumber,
    profile.soulNumber,
    profile.personalityNumber,
    profile.maturityNumber,
  ]

  const filledKeyFields = keyFields.filter((field) => field !== null && field !== 0).length
  const hasAdditionalInfo =
    profile.currentCycle || profile.talents || profile.gifts || profile.purpose || profile.karmicLessons

  if (filledKeyFields >= 3 && hasAdditionalInfo) {
    return 'complete'
  }
  if (filledKeyFields > 0 || hasAdditionalInfo) {
    return 'partial'
  }
  return 'empty'
}

/**
 * Определяет статус заполненности нейропсихологического профиля
 */
export function getNeuroPsychStatus(profile: NeuroPsychProfile | null): ProfileStatus {
  if (!profile) {
    return 'empty'
  }

  const fields = [
    profile.behaviorPatterns,
    profile.cognitiveStyle,
    profile.learningStyle,
    profile.defenseMechanisms,
    profile.emotionalPatterns,
  ]

  const filledFields = fields.filter((field) => field !== null && field !== '').length

  if (filledFields >= 3) {
    return 'complete'
  }
  if (filledFields > 0) {
    return 'partial'
  }
  return 'empty'
}

/**
 * Определяет статус заполненности энергетического профиля
 */
export function getEnergyStatus(profile: EnergyProfile | null): ProfileStatus {
  if (!profile) {
    return 'empty'
  }

  const chakras = [
    profile.rootChakra,
    profile.sacralChakra,
    profile.solarPlexusChakra,
    profile.heartChakra,
    profile.throatChakra,
    profile.thirdEyeChakra,
    profile.crownChakra,
  ]

  const filledChakras = chakras.filter((chakra) => chakra !== null && chakra !== undefined && chakra > 0).length
  const hasAdditionalInfo = profile.energyBlocks && profile.energyBlocks !== ''

  if (filledChakras >= 5 && hasAdditionalInfo) {
    return 'complete'
  }
  if (filledChakras >= 7) {
    return 'complete' // Все чакры заполнены
  }
  if (filledChakras > 0 || hasAdditionalInfo) {
    return 'partial'
  }
  return 'empty'
}

/**
 * Определяет статус заполненности телесного профиля
 */
export function getBodyStatus(profile: BodyProfile | null): ProfileStatus {
  if (!profile) {
    return 'empty'
  }

  const fields = [profile.tensionMap, profile.tensionAreas, profile.psychosomaticIssues, profile.breathingPatterns]

  const filledFields = fields.filter((field) => field !== null && field !== '').length

  if (filledFields >= 3) {
    return 'complete'
  }
  if (filledFields > 0) {
    return 'partial'
  }
  return 'empty'
}

/**
 * Определяет статус заполненности профиля стиля
 */
export function getStyleStatus(profile: StyleProfile | null): ProfileStatus {
  if (!profile) {
    return 'empty'
  }

  const hasColorType = profile.colorType !== null && profile.colorType !== ''
  const hasArchetype = profile.primaryArchetype !== null && profile.primaryArchetype !== ''
  const hasExpression = profile.selfExpression !== null && profile.selfExpression !== ''

  if (hasColorType && hasArchetype && hasExpression) {
    return 'complete'
  }
  if (hasColorType || hasArchetype) {
    return 'complete' // Основные поля заполнены
  }
  if (hasExpression) {
    return 'partial'
  }
  return 'empty'
}
