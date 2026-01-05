-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN     "deletedForAll" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "text" DROP NOT NULL;
