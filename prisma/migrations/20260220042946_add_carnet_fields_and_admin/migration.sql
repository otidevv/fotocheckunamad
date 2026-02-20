-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "carnetBackUrl" TEXT,
ADD COLUMN     "carnetFrontUrl" TEXT,
ADD COLUMN     "year" INTEGER NOT NULL DEFAULT 2026;

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
