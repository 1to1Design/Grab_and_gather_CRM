/*
  Warnings:

  - You are about to drop the column `notes` on the `leads` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Vertical" ADD VALUE 'DEALERSHIP';

-- AlterTable
ALTER TABLE "leads" DROP COLUMN "notes",
ADD COLUMN     "address" TEXT;

-- CreateTable
CREATE TABLE "lead_notes" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_notes_leadId_idx" ON "lead_notes"("leadId");

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
