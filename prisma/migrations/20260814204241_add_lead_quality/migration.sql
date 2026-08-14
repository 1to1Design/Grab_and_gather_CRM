-- CreateEnum
CREATE TYPE "LeadQuality" AS ENUM ('UNRATED', 'BELOW_THRESHOLD', 'QUALIFIED', 'HIGH_VOLUME', 'MEGA_TRAFFIC');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "leadQuality" "LeadQuality" NOT NULL DEFAULT 'UNRATED';

-- CreateIndex
CREATE INDEX "leads_leadQuality_idx" ON "leads"("leadQuality");
