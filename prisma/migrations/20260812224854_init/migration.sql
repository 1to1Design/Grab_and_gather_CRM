-- CreateEnum
CREATE TYPE "Vertical" AS ENUM ('GYM_FITNESS', 'URGENT_CARE_MEDICAL', 'COWORKING_OFFICE', 'APARTMENT_COMPLEX', 'WAREHOUSE_MANUFACTURING', 'SCHOOL_DISTRICT', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'FOLLOW_UP_NEEDED', 'MEETING_SCHEDULED', 'PLACED_WON', 'PASSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "vertical" "Vertical" NOT NULL,
    "contactName" TEXT,
    "contactTitle" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT NOT NULL,
    "nextFollowUpDate" TIMESTAMP(3),
    "dateLogged" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "footTrafficNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_vertical_idx" ON "leads"("vertical");

-- CreateIndex
CREATE INDEX "leads_nextFollowUpDate_idx" ON "leads"("nextFollowUpDate");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
