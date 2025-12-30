-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'Pending';

-- AlterTable
ALTER TABLE "Messages" ALTER COLUMN "status" SET DEFAULT 'Pending';
