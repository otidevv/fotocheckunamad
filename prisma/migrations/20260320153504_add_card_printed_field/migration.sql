-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "cardPrinted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "printedAt" TIMESTAMP(3);
