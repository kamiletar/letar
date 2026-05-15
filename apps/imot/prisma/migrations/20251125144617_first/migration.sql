-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'SPECIALIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransformationStage" AS ENUM ('DIAGNOSTICS', 'INTEGRATION', 'STRATEGY', 'PRACTICE', 'RESULT');

-- CreateEnum
CREATE TYPE "ChakraType" AS ENUM ('ROOT', 'SACRAL', 'SOLAR_PLEXUS', 'HEART', 'THROAT', 'THIRD_EYE', 'CROWN');

-- CreateEnum
CREATE TYPE "ColorType" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');

-- CreateEnum
CREATE TYPE "Archetype" AS ENUM ('INNOCENT', 'EVERYMAN', 'HERO', 'OUTLAW', 'EXPLORER', 'CREATOR', 'RULER', 'MAGICIAN', 'LOVER', 'CAREGIVER', 'JESTER', 'SAGE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "hashedPassword" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "phoneNumber" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "notifySessionReminders" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewPractices" BOOLEAN NOT NULL DEFAULT true,
    "notifyPracticeDiary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EMAIL_VERIFICATION',

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "gender" "Gender",
    "birthdate" TIMESTAMP(3),
    "photo" TEXT,
    "mainRequest" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TherapySession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "topic" TEXT,
    "notes" TEXT,
    "homework" TEXT,
    "recordingUrl" TEXT,
    "materials" TEXT,
    "meetingUrl" TEXT,
    "paymentUrl" TEXT,
    "paymentStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumerologyProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lifePathNumber" INTEGER,
    "destinyNumber" INTEGER,
    "soulNumber" INTEGER,
    "personalityNumber" INTEGER,
    "maturityNumber" INTEGER,
    "currentCycle" TEXT,
    "cycleDescription" TEXT,
    "talents" TEXT,
    "gifts" TEXT,
    "purpose" TEXT,
    "karmicLessons" TEXT,
    "karmicDebts" TEXT,
    "matrixData" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumerologyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeuroPsychProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "behaviorPatterns" TEXT,
    "cognitiveStyle" TEXT,
    "learningStyle" TEXT,
    "decisionMaking" TEXT,
    "defenseMechanisms" TEXT,
    "copingStrategies" TEXT,
    "emotionalPatterns" TEXT,
    "triggers" TEXT,
    "resourceStates" TEXT,
    "strengths" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeuroPsychProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "rootChakra" INTEGER,
    "sacralChakra" INTEGER,
    "solarPlexusChakra" INTEGER,
    "heartChakra" INTEGER,
    "throatChakra" INTEGER,
    "thirdEyeChakra" INTEGER,
    "crownChakra" INTEGER,
    "energyBlocks" TEXT,
    "blockageAreas" TEXT,
    "moneyChannelLevel" INTEGER,
    "moneyBlockages" TEXT,
    "relationshipEnergy" INTEGER,
    "relationshipBlocks" TEXT,
    "vitalityLevel" INTEGER,
    "energyLeaks" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tensionMap" TEXT,
    "tensionAreas" TEXT,
    "psychosomaticIssues" TEXT,
    "symptoms" TEXT,
    "chronicConditions" TEXT,
    "breathingPatterns" TEXT,
    "breathingIssues" TEXT,
    "bodyResources" TEXT,
    "physicalStrengths" TEXT,
    "bodyMindConnection" TEXT,
    "bodyMessages" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "colorType" "ColorType",
    "colorPalette" TEXT,
    "colorRecommendations" TEXT,
    "primaryArchetype" "Archetype",
    "secondaryArchetype" "Archetype",
    "archetypeDescription" TEXT,
    "selfExpression" TEXT,
    "authenticityLevel" INTEGER,
    "innerOuterAlignment" TEXT,
    "styleConflicts" TEXT,
    "styleRecommendations" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransformationPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "currentStage" "TransformationStage" NOT NULL DEFAULT 'DIAGNOSTICS',
    "diagnosticsDescription" TEXT,
    "integrationDescription" TEXT,
    "strategyDescription" TEXT,
    "practiceDescription" TEXT,
    "expectedResults" TEXT,
    "keyPoints" TEXT,
    "priorities" TEXT,
    "startDate" TIMESTAMP(3),
    "expectedEndDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransformationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Practice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "frequency" TEXT,
    "duration" TEXT,
    "materials" TEXT,
    "videoUrl" TEXT,
    "audioUrl" TEXT,
    "isAssigned" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "clientNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "description" TEXT,
    "practiceId" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NumerologyProfile_clientId_key" ON "NumerologyProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "NeuroPsychProfile_clientId_key" ON "NeuroPsychProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyProfile_clientId_key" ON "EnergyProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "BodyProfile_clientId_key" ON "BodyProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "StyleProfile_clientId_key" ON "StyleProfile"("clientId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapySession" ADD CONSTRAINT "TherapySession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapySession" ADD CONSTRAINT "TherapySession_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumerologyProfile" ADD CONSTRAINT "NumerologyProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeuroPsychProfile" ADD CONSTRAINT "NeuroPsychProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyProfile" ADD CONSTRAINT "EnergyProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyProfile" ADD CONSTRAINT "BodyProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleProfile" ADD CONSTRAINT "StyleProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransformationPlan" ADD CONSTRAINT "TransformationPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
