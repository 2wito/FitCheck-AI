-- DropForeignKey
ALTER TABLE "try_ons" DROP CONSTRAINT "try_ons_outfitId_fkey";

-- DropForeignKey
ALTER TABLE "try_ons" DROP CONSTRAINT "try_ons_userId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "bodyPhotoPath";

-- DropTable
DROP TABLE "try_ons";

