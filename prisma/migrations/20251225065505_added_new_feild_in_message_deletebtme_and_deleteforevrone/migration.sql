-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "deletedByMeId" INTEGER,
ADD COLUMN     "deletedForAll" BOOLEAN NOT NULL DEFAULT false;
