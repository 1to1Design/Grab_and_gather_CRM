-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "lastContactedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "leads_lastContactedAt_idx" ON "leads"("lastContactedAt");
