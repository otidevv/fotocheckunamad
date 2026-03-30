-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "cardDelivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveredAt" TIMESTAMP(3);
