-- DropIndex
DROP INDEX "TimeSlot_status_idx";

-- CreateIndex
CREATE INDEX "TimeSlot_instructorId_status_startTime_idx" ON "TimeSlot"("instructorId", "status", "startTime");
